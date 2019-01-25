const WEBGL = require('../lib/WebGL');
const Viewer = require('./viewer');
const SimpleDropzone = require('simple-dropzone');
const ValidationController = require('./validation-controller');
const queryString = require('query-string');
// const cubeRoomGltf = require('../assets/environment/CubeRoom/CubeRoom.gltf');
// const cubeRoom = require('../assets/environment/CubeRoom');
// const Sofa = require('../assets/environment/Sofa/index');

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  console.error('The File APIs are not fully supported in this browser.');
} else if (!WEBGL.isWebGLAvailable()) {
  console.error('WebGL is not supported in this browser.');
}

class App {

  /**
   * @param  {Element} el
   * @param  {Location} location
   */
  constructor (el, location) {

    const hash = location.hash ? queryString.parse(location.hash) : {};
    this.options = {
      kiosk: Boolean(hash.kiosk),
      model: hash.model || '',
      preset: hash.preset || '',
      cameraPosition: hash.cameraPosition
        ? hash.cameraPosition.split(',').map(Number)
        : null
    };

    window.app = this;

    this.el = el;
    this.viewer = null;
    this.viewerEl = null;
    this.spinnerEl = el.querySelector('.spinner');
    this.dropEl = el.querySelector('.dropzone');
    this.inputEl = el.querySelector('#file-input');
    this.validationCtrl = new ValidationController(el);

    this.createDropzone();
    this.hideSpinner();

    this.preload();

    const options = this.options;

    if (options.kiosk) {
      const headerEl = document.querySelector('header');
      headerEl.style.display = 'none';
    }

    if (options.model) {
      this.view(options.model, '', new Map());
    }
  }

  /**
   * To create local file from URL
   */
  async createFile(url){
    let response = await fetch(url);
    let data = await response.blob();
    let filename = url.split("/").pop();
    let fileExt = url.split(".")[1];      //Note - may give errors for few urls
    
    let extToMetaTypeMap = {
      "bin": "application/octet-stream",
      "gltf": "",
      "png": "image/png",
      "jpg": "image/jpg",
      "jpeg": "image/jpeg",
    }

    let metadata = {
      type: extToMetaTypeMap[fileExt]
    };
    return new File([data], filename, metadata);
  }

  /**
   * To create FileMap for URL array
   */
  createFileMap(urls){
    return new Promise((res, rej) => {
      let fileMap = new Map();
      let arrayLen = urls.length;
      let count = 0;
      urls.forEach(async (url, index, urls) => {
          let file = await this.createFile(url);
          fileMap.set(url, file);
          count++;

          if(count == arrayLen){
            res(fileMap);
          }
      })
    })
  }

  /**
   * Sets up the objects for POC.
   */
  async preload(){
    let rootFile = '../Assets1/CubeRoom/CubeRoom.gltf';
    let rootPath = '../Assets1/CubeRoom/';
    let assetUrls = [ '/Assets1/CubeRoom/CubeRoom.bin', 
                      '/Assets1/CubeRoom/CubeRoom.gltf', 
                      '/Assets1/CubeRoom/CubeRoom_BakedDiffuse_4096.png']
    this.createFileMap(assetUrls)
    .then((fileMap) => {
      this.view(rootFile, rootPath, fileMap);
    }).then(()=>{
      let rootFile1 = '../Assets1/Sofa/scene.gltf';
      let rootPath1 = '../Assets1/Sofa/';
      let assetUrls1 = [ '/Assets1/Sofa/scene.bin', 
                        '/Assets1/Sofa/scene.gltf', 
                        '/Assets1/Sofa/textures/pasted__sofalegsShape_bakedmtl2_metallicRoughness.png',
                        '/Assets1/Sofa/textures/pasted__sofabody2Shape_bakedmtl2_metallicRoughness.png',
                        '/Assets1/Sofa/textures/pasted__sofabody2Shape_bakedmtl2_baseColor.png'
                      ]
      this.createFileMap(assetUrls1)
      .then((fileMap) => {
        this.view(rootFile1, rootPath1, fileMap);
      });
    }
    );
  }

  /**
   * Sets up the drag-and-drop controller.
   */
  createDropzone () {
    const dropCtrl = new SimpleDropzone(this.dropEl, this.inputEl);
    dropCtrl.on('drop', ({files}) => {debugger; return this.load(files)});
    dropCtrl.on('dropstart', () => this.showSpinner());
    dropCtrl.on('droperror', () => this.hideSpinner());
  }

  /**
   * Sets up the view manager.
   * @return {Viewer}
   */
  createViewer () {
    this.viewerEl = document.createElement('div');
    this.viewerEl.classList.add('viewer');
    this.dropEl.innerHTML = '';
    this.dropEl.appendChild(this.viewerEl);
    this.viewer = new Viewer(this.viewerEl, this.options);
    return this.viewer;
  }

  /**
   * Loads a fileset provided by user action.
   * @param  {Map<string, File>} fileMap
   */
  load (fileMap) {
    let rootFile;
    let rootPath;
    Array.from(fileMap).forEach(([path, file]) => {
      if (file.name.match(/\.(gltf|glb)$/)) {
        rootFile = file;
        rootPath = path.replace(file.name, '');
      }
    });

    if (!rootFile) {
      this.onError('No .gltf or .glb asset found.');
    }

    this.view(rootFile, rootPath, fileMap);
  }

  /**
   * Passes a model to the viewer, given file and resources.
   * @param  {File|string} rootFile
   * @param  {string} rootPath
   * @param  {Map<string, File>} fileMap
   */
  view (rootFile, rootPath, fileMap) {

    // if (this.viewer) this.viewer.clear();

    const viewer = this.viewer || this.createViewer();
    window.viewer = viewer;

    const fileURL = typeof rootFile === 'string'
      ? rootFile
      : URL.createObjectURL(rootFile);

    const cleanup = () => {
      this.hideSpinner();
      if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
    };

    viewer
      .load(fileURL, rootPath, fileMap)
      .catch((e) => this.onError(e))
      .then((gltf) => {
        if (!this.options.kiosk) {
          this.validationCtrl.validate(fileURL, rootPath, fileMap, gltf);
        }
        cleanup();
        if(rootPath.includes("CubeRoom")){
          viewer.scene.children[1].position.set(0,0,0);
          viewer.scene.children[1].scale.multiplyScalar(300);
        }
        if(rootPath.includes("Sofa")){
          viewer.scene.children[2].position.set(0,0,0);
          viewer.scene.children[2].scale.multiplyScalar(0.6);
        }
      });
  }

  /**
   * @param  {Error} error
   */
  onError (error) {
    let message = (error||{}).message || error.toString();
    if (message.match(/ProgressEvent/)) {
      message = 'Unable to retrieve this file. Check JS console and browser network tab.';
    } else if (message.match(/Unexpected token/)) {
      message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`;
    } else if (error && error.target && error.target instanceof Image) {
      error = 'Missing texture: ' + error.target.src.split('/').pop();
    }
    window.alert(message);
    console.error(error);
  }

  showSpinner () {
    this.spinnerEl.style.display = '';
  }

  hideSpinner () {
    this.spinnerEl.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {

  const app = new App(document.body, location);
  var autoRotate = document.querySelector('input[id="autoRotate"]');
    autoRotate.onchange = () => {
      if(window.viewer){
        viewer.controls.autoRotate = autoRotate.checked;
      }
  }
});