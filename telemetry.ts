import { TelemetryKeys } from './telemetry-keys';
const ByteBuffer = require('bytebuffer');

const log = [];
let timeIndex = 1;
let previousTime = '';

function parseLine(key, f, s) {
    if(key == 'TL_TIM') {
        if (f != previousTime) {
            log[0][timeIndex] = f;
            previousTime = f;
            timeIndex ++;
        }
    }
    else {
        const telemObject = TelemetryKeys[key];
        const firstElement = document.getElementById(telemObject.id1);
        const secondElement = document.getElementById(telemObject.id2);

        f = convertData(f, telemObject.type1);
        s = convertData(s, telemObject.type2);

        if (firstElement) {
            if (firstElement.getAttribute('data-value')) {
                firstElement.setAttribute('data-value', f);
            }
            else {
                firstElement.innerHTML = f;
            }
        }
    
        if (secondElement) {
            if (secondElement.getAttribute('data-value')) {
                secondElement.setAttribute('data-value', s);
            }
            else {
                secondElement.innerHTML = s;
            }
        }
    
        let index = (Object.keys(TelemetryKeys).indexOf(key) + 1) * 2;
        if (index >= 0) {
            log[index][timeIndex] = f;
            log[index+1][timeIndex] = s;
        }
    }
}

function convertData(data, type) {
    switch (type) {
        case 'f': 
            return getFloat(data);
        case 'i':
            return getInt(data);
        case 'b': 
            return  getBoolan(data);
    }
}

function getFloat(hex) {
    if (hex == 'HHHHHHHH') {
        return 'error';
    }
    var buf = ByteBuffer.fromHex(hex, true);
    return buf.readFloat().toFixed(4);
}

function getInt(hex) {
    return parseInt(hex, 16);
}

function getBoolan(hex) {
    return ("00000000" + (parseInt(hex.substring(0, 2), 16)).toString(2)).substr(-8);
}

function setSwitch(value, id){
    var s = document.getElementById(id);
    if (value == '1'){
        s.classList.remove('bottom');
        s.classList.add('top');
    }
    else {
        s.classList.remove('top');
        s.classList.add('bottom');
    }
}

function initLog() {
    log.push(['Time']);
    Object.keys(TelemetryKeys).forEach(key => {
        log.push([TelemetryKeys[key].title1]);
        log.push([TelemetryKeys[key].title2]);
    });
}

function getLog() {
    console.log(log);
}