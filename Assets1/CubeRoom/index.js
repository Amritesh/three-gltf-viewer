// const gltf = require("./CubeRoom.gltf");
const bin = require("./CubeRoom.bin");
const image = require("./CubeRoom_BakedDiffuse_4096.png");
module.exports = [
    {
        // name: 'CubeRoom_BakedDiffuse_4096',
        path: 'assets/environment/CubeRoom/',
        file: image
    },
    {
        // name: 'CubeRoom_gltf',
        path: 'assets/environment/CubeRoom/',
        file: gltf
    },
    {
        // name: 'CubeRoom_bin',
        path: 'assets/environment/CubeRoom/',
        file: bin
    },
  ];
  