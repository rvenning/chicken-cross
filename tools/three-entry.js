// The slice of three.js the 3D view uses, bundled to vendor/three/three.min.js as
// an IIFE that sets window.THREE. The game has no build step, so this is the
// one generated file: rebuild it only when render3d.js needs a new class.
//
//   npm pack three@0.186.0 && tar xzf three-0.186.0.tgz
//   npx esbuild tools/three-entry.js --bundle --minify --format=iife \
//     --global-name=THREE --alias:three=./package/build/three.module.js \
//     --outfile=vendor/three/three.min.js
export {
  WebGLRenderer, Scene, OrthographicCamera, HemisphereLight, DirectionalLight,
  Color, BoxGeometry, CylinderGeometry, ConeGeometry, IcosahedronGeometry,
  DodecahedronGeometry, OctahedronGeometry, RingGeometry, BufferGeometry,
  Float32BufferAttribute, Mesh, Group, MeshLambertMaterial, MeshBasicMaterial, PointLight,
  Matrix4, Matrix3, Vector3, Quaternion, Euler, PCFShadowMap, DoubleSide, AdditiveBlending,
} from "three";
