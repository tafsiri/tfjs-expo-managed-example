/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as blazeface from '@tensorflow-models/blazeface';
import * as Permissions from 'expo-permissions';
import { Camera } from 'expo-camera';
import {cameraWithTensors} from '@tensorflow/tfjs-react-native';

const TensorCamera = cameraWithTensors(Camera);
const AUTORENDER = true;
let frameCount = 0;
const makePredictionEveryNFrames = 3;

// Position of camera preview.
const previewLeft = 40;
const previewTop = 20;
const previewWidth = 300;
const previewHeight = 400;

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTfReady: false,
      cameraType: Camera.Constants.Type.front,
      lastShape: 'none',
      faces: [],
    };

    this.handleImageTensorReady = this.handleImageTensorReady.bind(this);
  }

  async loadBlazefaceModel() {
    return await blazeface.load();
  }

  async componentDidMount() {    
    await tf.ready();
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    let textureDims;
    if (Platform.OS === 'ios') {
      textureDims = { height: 1920,width: 1080 };
    } else {
      textureDims = { height: 1200, width: 1600 };
    }
    const tensorDims = {height: 300, width: 400 };

    const scale = {
      height: styles.camera.height / tensorDims.height,
      width: styles.camera.width / tensorDims.width,
    }

    const blazefaceModel = await this.loadBlazefaceModel();
    this.setState({
      isTfReady: true,
      permissionsStatus: status,
      faceDetector: blazefaceModel,
      textureDims,
      tensorDims,
      scale,
    });
  }

  async handleImageTensorReady(images) {
    const loop = async () => {         
      if (this.state.faceDetector != null) {                
        if(frameCount % makePredictionEveryNFrames === 0) {
          const imageTensor = images.next().value;
          const returnTensors = false;          
          const faces = await this.state.faceDetector.estimateFaces(
            imageTensor, returnTensors);
          tf.dispose(imageTensor);          
          this.setState({faces});
        }
        
      }
      frameCount += 1;
      frameCount = frameCount % makePredictionEveryNFrames;
      this.rafID = requestAnimationFrame(loop);
    };

    loop();
  }

  componentWillUnmount() {
    if(this.rafID) {
      cancelAnimationFrame(this.rafID);
    }
  }

  renderInitialization() {
    return (
      <View style={styles.container}>
        <Text>Initializaing TensorFlow.js!</Text>
        <Text>tf.version {tf.version_core}</Text>
        <Text>tf.backend {tf.getBackend()}</Text>        
      </View>
    );
  }

  renderFacesDebugInfo() {
    const {faces} = this.state;
    return faces.map((face, i) => {
      const {topLeft, bottomRight, probability} = face;
      
      return <Text key={`faceInfo${i}`}>
        probability: {probability[0].toFixed(3)} | 
        TL: [{topLeft[0].toFixed(1)}, {topLeft[1].toFixed(1)}] |
        BR: [{bottomRight[0].toFixed(1)}, {bottomRight[1].toFixed(1)}]</Text>
    });
  }

  renderMain() {
    const {textureDims, faces, tensorDims} = this.state;

    const camView = <View style={styles.cameraContainer}>
      <TensorCamera
        // Standard Camera props
        style={styles.camera}
        type={this.state.cameraType}
        zoom={0}
        // tensor related props
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}
        resizeHeight={tensorDims.height}
        resizeWidth={tensorDims.width}
        resizeDepth={3}
        onReady={this.handleImageTensorReady}
        autorender={AUTORENDER}
      />      
    </View>;

   
    return (
      <View>
        {camView}
        <Text>tf.version {tf.version_core}</Text>
        <Text>tf.backend {tf.getBackend()}</Text>
        <Text># faces detected: {faces.length}</Text>
        {this.renderBoundingBoxes()}
        {this.renderFacesDebugInfo()}
      </View>
    );
  }

  renderBoundingBoxes() {
    const {faces, scale} = this.state;
    // On android the bounding boxes need to be mirrored horizontally
    const flipHorizontal = Platform.OS === 'ios' ? false : true;
    return faces.map((face, i) => {
      const {topLeft, bottomRight} = face;
      const bbLeft = (topLeft[0] * scale.width);      
      const boxStyle = Object.assign({}, styles.bbox, {
        left: flipHorizontal ? (previewWidth - bbLeft) - previewLeft :  bbLeft + previewLeft,
        top: (topLeft[1] * scale.height) + 20,
        width: (bottomRight[0] - topLeft[0]) * scale.width,
        height: (bottomRight[1] - topLeft[1]) * scale.height,
      });

      return <View style={boxStyle} key={`face${i}`}></View>      
    1});
  }

  render() {
    const {isTfReady} = this.state;
    return (
      isTfReady ? this.renderMain() : this.renderInitialization()
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '80%',
    backgroundColor: '#fff',
  },
  camera : {
    position:'absolute',
    left: previewLeft,
    top: previewTop,
    width: previewWidth,
    height: previewHeight,
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 0,
  },
  bbox: {
    position:'absolute',
    borderWidth: 2,
    borderColor: 'red',
    borderRadius: 0,
  }
});
