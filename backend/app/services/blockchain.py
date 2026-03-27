"""
VARUNA — Cryptographic Audit Ledger (Merkle Tree)
===================================================
Creates a tamper-proof chain of evidence for every freeze decision.
Each decision is hashed with SHA-256 and batched into a Merkle tree.
If any single decision is altered, the root hash changes — instant
tampering detection.

This provides regulators with a cryptographic guarantee that VARUNA's
automated decisions have not been retroactively modified.

Architecture:
    1. Each freeze/block decision → leaf hash = SHA-256(data)
    2. Leaves are batched into a Merkle tree
    3. Root hash is stored as the "seal" of that batch
    4. API exposes ledger for audit queries
"""
from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class AuditEntry:
    """A single auditable decision event."""
    entry_id: str
    account_id: str
    risk_score: float
    decision: str        # BLOCK, FREEZE, REVIEW, APPROVE
    timestamp: float
    gat_score: float
    lstm_score: float
    eif_score: float
    flag_hits: list[str]
    leaf_hash: str = ""

    def __post_init__(self):
        if not self.leaf_hash:
            self.leaf_hash = self._compute_hash()

    def _compute_hash(self) -> str:
        raw = (
            f"{self.account_id}|{self.risk_score:.4f}|{self.decision}|"
            f"{self.timestamp}|{self.gat_score:.4f}|{self.lstm_score:.4f}|"
            f"{self.eif_score:.4f}|{'_'.join(self.flag_hits)}"
        )
        return hashlib.sha256(raw.encode()).hexdigest()


@dataclass
class MerkleBlock:
    """A batch of audit entries sealed by a Merkle root hash."""
    block_id: int
    entries: list[AuditEntry]
    root_hash: str
    created_at: float
    previous_block_hash: str = ""


class VarunaLedger:
    """In-memory tamper-proof audit ledger using Merkle trees."""

    BATCH_SIZE = 10  # Seal a Merkle tree every N entries

    def __init__(self):
        self._pending: list[AuditEntry] = []
        self._blocks: list[MerkleBlock] = []
        self._entry_count: int = 0

    def record_decision(
        self,
        account_id: str,
        risk_score: float,
        decision: str,
        gat_score: float = 0.0,
        lstm_score: float = 0.0,
        eif_score: float = 0.0,
        flag_hits: list[str] | None = None,
    ) -> AuditEntry:
        """Record a new auditable decision. Automatically seals when batch is full."""
        self._entry_count += 1
        entry = AuditEntry(
            entry_id=f"VARUNA-{self._entry_count:06d}",
            account_id=account_id,
            risk_score=risk_score,
            decision=decision,
            timestamp=time.time(),
            gat_score=gat_score,
            lstm_score=lstm_score,
            eif_score=eif_score,
            flag_hits=flag_hits or [],
        )
        self._pending.append(entry)

        if len(self._pending) >= self.BATCH_SIZE:
            self._seal_block()

        return entry

    def _seal_block(self):
        """Seal pending entries into a Merkle block."""
        if not self._pending:
            return

        leaf_hashes = [e.leaf_hash for e in self._pending]
        root_hash = self._merkle_root(leaf_hashes)
        previous = self._blocks[-1].root_hash if self._blocks else "GENESIS"

        block = MerkleBlock(
            block_id=len(self._blocks) + 1,
            entries=list(self._pending),
            root_hash=root_hash,
            created_at=time.time(),
            previous_block_hash=previous,
        )
        self._blocks.append(block)
        self._pending.clear()

    @staticmethod
    def _merkle_root(hashes: list[str]) -> str:
        """Compute Merkle root from a list of leaf hashes."""
        if not hashes:
            return hashlib.sha256(b"EMPTY").hexdigest()
        if len(hashes) == 1:
            return hashes[0]

        # Pad to even number
        level = list(hashes)
        while len(level) > 1:
            if len(level) % 2 != 0:
                level.append(level[-1])  # duplicate last
            next_level = []
            for i in range(0, len(level), 2):
                combined = level[i] + level[i + 1]
                next_level.append(hashlib.sha256(combined.encode()).hexdigest())
            level = next_level

        return level[0]

    def verify_integrity(self) -> dict:
        """Verify the entire ledger chain has not been tampered with."""
        if not self._blocks:
            return {"valid": True, "blocks_verified": 0, "status": "empty ledger"}

        issues = []
        for i, block in enumerate(self._blocks):
            # Verify Merkle root
            leaf_hashes = [e.leaf_hash for e in block.entries]
            expected_root = self._merkle_root(leaf_hashes)
            if expected_root != block.root_hash:
                issues.append(f"Block {block.block_id}: Merkle root mismatch")

            # Verify chain linkage
            if i > 0:
                if block.previous_block_hash != self._blocks[i - 1].root_hash:
                    issues.append(f"Block {block.block_id}: chain linkage broken")

            # Verify individual leaf hashes
            for entry in block.entries:
                recomputed = entry._compute_hash()
                if recomputed != entry.leaf_hash:
                    issues.append(f"Entry {entry.entry_id}: leaf hash tampered")

        return {
            "valid": len(issues) == 0,
            "blocks_verified": len(self._blocks),
            "total_entries": sum(len(b.entries) for b in self._blocks) + len(self._pending),
            "issues": issues,
            "status": "✅ INTEGRITY VERIFIED" if not issues else "❌ TAMPERING DETECTED",
        }

    def get_ledger_summary(self) -> dict:
        """Return a summary of the audit ledger for the dashboard."""
        # Force-seal any pending entries for display
        if self._pending:
            self._seal_block()

        total_entries = sum(len(b.entries) for b in self._blocks)
        blocks_data = []
        for block in self._blocks[-5:]:  # Last 5 blocks
            blocks_data.append({
                "block_id": block.block_id,
                "entries": len(block.entries),
                "root_hash": block.root_hash[:16] + "...",
                "previous_hash": block.previous_block_hash[:16] + "..." if block.previous_block_hash != "GENESIS" else "GENESIS",
                "created_at": block.created_at,
            })

        integrity = self.verify_integrity()

        return {
            "total_blocks": len(self._blocks),
            "total_entries": total_entries,
            "latest_root_hash": self._blocks[-1].root_hash if self._blocks else None,
            "chain_valid": integrity["valid"],
            "integrity_status": integrity["status"],
            "recent_blocks": blocks_data,
        }

    def get_entry_proof(self, entry_id: str) -> Optional[dict]:
        """Get a Merkle proof for a specific entry (for regulatory audit)."""
        for block in self._blocks:
            for entry in block.entries:
                if entry.entry_id == entry_id:
                    return {
                        "entry": asdict(entry),
                        "block_id": block.block_id,
                        "block_root_hash": block.root_hash,
                        "block_previous_hash": block.previous_block_hash,
                        "verified": entry._compute_hash() == entry.leaf_hash,
                    }
        return None


# ── Global Ledger Singleton ──
varuna_ledger = VarunaLedger()
