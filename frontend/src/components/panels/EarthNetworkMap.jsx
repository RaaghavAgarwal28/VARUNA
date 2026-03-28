import React, { useState, useEffect, useMemo, useRef } from "react";
import { Viewer, GeoJsonDataSource, CameraFlyTo, ScreenSpaceEventHandler, ScreenSpaceEvent } from "resium";
import { Color, Cartesian3, ColorMaterialProperty, ScreenSpaceEventType, defined } from "cesium";
import { formatCurrency } from "../../lib/format";

// Threat color mapping
const threatColor = {
  Severe: { fill: Color.fromCssColorString("rgba(255,95,121,0.6)"), outline: Color.fromCssColorString("#ff5f79") },
  High: { fill: Color.fromCssColorString("rgba(255,157,67,0.5)"), outline: Color.fromCssColorString("#ff9d43") },
  Elevated: { fill: Color.fromCssColorString("rgba(255,69,0,0.3)"), outline: Color.fromCssColorString("rgba(255,69,0,0.8)") },
  none: { fill: Color.fromCssColorString("rgba(255,69,0,0.05)"), outline: Color.fromCssColorString("rgba(255,69,0,0.15)") },
};

export function EarthNetworkMap({ stateIntel }) {
  const [selectedState, setSelectedState] = useState(null);
  const viewerRef = useRef(null);
  
  const stateDataMap = useMemo(() => {
    const map = {};
    (stateIntel || []).forEach((s) => {
      if (s && s.state) {
        map[s.state.toLowerCase()] = s;
      }
    });
    return map;
  }, [stateIntel]);

  const handleStateLoad = async (dataSource) => {
    const entities = dataSource.entities.values;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      let stateName = entity.properties.NAME_1?.getValue() || entity.properties.st_nm?.getValue() || "";
      
      const data = stateDataMap[stateName.toLowerCase()];
      const level = data?.threatLevel || "none";
      const colors = threatColor[level];

      if (entity.polygon) {
        const exposure = data?.totalExposure || 0;
        const height = exposure > 0 ? 50000 + (exposure / 1000) : 0;
        
        entity.polygon.material = new ColorMaterialProperty(colors.fill);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = colors.outline;
        
        if (exposure > 0) {
            entity.polygon.extrudedHeight = height;
        }
        
        // Attach data for picking
        entity.stateData = data;
        entity.stateName = stateName;
      }
    }
  };

  const handleDistrictLoad = async (dataSource) => {
      const entities = dataSource.entities.values;
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.polygon) {
            entity.polygon.material = new ColorMaterialProperty(Color.fromCssColorString("rgba(255,69,0,0.1)"));
            entity.polygon.outline = true;
            entity.polygon.outlineColor = Color.fromCssColorString("rgba(255,69,0,0.4)");
        }
      }
  };

  const handleEntityClick = (movement) => {
    if (!viewerRef.current?.cesiumElement) return;
    const viewer = viewerRef.current.cesiumElement;
    const pickedObject = viewer.scene.pick(movement.position);

    if (defined(pickedObject) && pickedObject.id && pickedObject.id.stateName) {
       setSelectedState(pickedObject.id.stateName);
       // Fly to the state's bounding box using its polygon
       viewer.flyTo(pickedObject.id, { duration: 1.5 });
    }
  };

  return (
    <div className="panel p-5 relative">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-heading">India Banking Network Intelligence (3D Globe)</div>
          <div className="text-sm text-white/40">
            Click any state to fly to it and reveal district-level anomalies
          </div>
        </div>
        {selectedState && (
          <button
            onClick={() => setSelectedState(null)}
            className="rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[#FF4500] transition-colors hover:bg-[#FF4500]/20"
          >
            ← Global View
          </button>
        )}
      </div>

      <div className="h-[600px] w-full rounded-[28px] overflow-hidden relative border border-white/[0.07]">
        <Viewer 
          ref={viewerRef}
          full 
          animation={false} 
          timeline={false} 
          homeButton={false} 
          navigationHelpButton={false}
          baseLayerPicker={false}
          sceneModePicker={false}
          geocoder={false}
          infoBox={false}
          selectionIndicator={false}
        >
          <ScreenSpaceEventHandler>
            <ScreenSpaceEvent action={handleEntityClick} type={ScreenSpaceEventType.LEFT_CLICK} />
          </ScreenSpaceEventHandler>

          {/* Initial View over India */}
          {!selectedState && <CameraFlyTo duration={2} destination={Cartesian3.fromDegrees(78.9629, 20.5937, 5000000)} />}
          
          {/* States Map */}
          {!selectedState && (
             <GeoJsonDataSource 
                 data="/data/india_states.geojson" 
                 onLoad={handleStateLoad} 
             />
          )}

          {/* Districts Map (rendered when zoomed in to a state) */}
          {selectedState && (
             <GeoJsonDataSource 
                 data="/data/india_districts.geojson" 
                 onLoad={handleDistrictLoad} 
             />
          )}
        </Viewer>
      </div>
    </div>
  );
}
