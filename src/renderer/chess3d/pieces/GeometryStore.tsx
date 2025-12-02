import React, { createContext, useContext, useMemo, ReactNode } from "react";
import * as THREE from "three";

interface GeometryStore {
  cylinder: (
    key: string,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    segments?: number
  ) => THREE.CylinderGeometry;
  sphere: (
    key: string,
    radius: number,
    widthSegments?: number,
    heightSegments?: number,
    phiStart?: number,
    phiLength?: number,
    thetaStart?: number,
    thetaLength?: number
  ) => THREE.SphereGeometry;
  box: (
    key: string,
    width: number,
    height: number,
    depth: number
  ) => THREE.BoxGeometry;
  material: (
    key: string,
    color: string,
    roughness?: number,
    metalness?: number
  ) => THREE.MeshStandardMaterial;
}

const GeometryContext = createContext<GeometryStore | null>(null);

export const GeometryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const store = useMemo(() => {
    const cylinderCache = new Map<string, THREE.CylinderGeometry>();
    const sphereCache = new Map<string, THREE.SphereGeometry>();
    const boxCache = new Map<string, THREE.BoxGeometry>();
    const materialCache = new Map<string, THREE.MeshStandardMaterial>();

    return {
      cylinder: (
        key: string,
        radiusTop: number,
        radiusBottom: number,
        height: number,
        segments = 32
      ) => {
        let geo = cylinderCache.get(key);
        if (!geo) {
          geo = new THREE.CylinderGeometry(
            radiusTop,
            radiusBottom,
            height,
            segments
          );
          cylinderCache.set(key, geo);
        }
        return geo;
      },
      sphere: (
        key: string,
        radius: number,
        widthSegments = 32,
        heightSegments = 32,
        phiStart = 0,
        phiLength = Math.PI * 2,
        thetaStart = 0,
        thetaLength = Math.PI
      ) => {
        let geo = sphereCache.get(key);
        if (!geo) {
          geo = new THREE.SphereGeometry(
            radius,
            widthSegments,
            heightSegments,
            phiStart,
            phiLength,
            thetaStart,
            thetaLength
          );
          sphereCache.set(key, geo);
        }
        return geo;
      },
      box: (key: string, width: number, height: number, depth: number) => {
        let geo = boxCache.get(key);
        if (!geo) {
          geo = new THREE.BoxGeometry(width, height, depth);
          boxCache.set(key, geo);
        }
        return geo;
      },
      material: (
        key: string,
        color: string,
        roughness = 0.5,
        metalness = 0.05
      ) => {
        let mat = materialCache.get(key);
        if (!mat) {
          mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
          materialCache.set(key, mat);
        }
        return mat;
      },
    };
  }, []);

  return (
    <GeometryContext.Provider value={store}>
      {children}
    </GeometryContext.Provider>
  );
};

export const useGeometryStore = (): GeometryStore => {
  const ctx = useContext(GeometryContext);
  if (!ctx) {
    throw new Error("useGeometryStore must be used within a GeometryProvider");
  }
  return ctx;
};
