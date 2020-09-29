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
import { StyleSheet, Text, View, Image } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as toxicity from '@tensorflow-models/toxicity';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTfReady: false,
    };
  }

  async loadToxicityModel() {
    return await toxicity.load();
  }

  async componentDidMount() {    
    await tf.ready();
    const toxicityModel = await this.loadToxicityModel(0.9);
    const modelOutput = await toxicityModel.classify(['you suck','I love you']);
    console.log('\nmodel output len', modelOutput.length)
    modelOutput.forEach((classifications) => {
      console.log('Label', classifications.label);
      console.log('Results', classifications.results);
    })
    this.setState({
      isTfReady: true,
      toxicityModel,
      modelOutput
    });
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

  renderMain() {
    return (
      <View style={styles.container}>
        <Text>Model Output!</Text>
      </View>
    );
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
});
