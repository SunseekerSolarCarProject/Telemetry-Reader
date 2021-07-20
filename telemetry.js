const ByteBuffer = require('bytebuffer');

let logs = new Array(30);
let timer;
for (var i = 0; i < logs.length; i ++) {
    logs[i] = new Array();
}

let logCount = 0;

let currentLog = 0;

const packets = [
    ['MC1BUS','mc1Voltage','mc1Current','float','float'],
    ['MC1VEL','mc1Velocityrpm','mc1Velocityms','float','float'],
    ['MC2BUS','mc2Voltage','mc2Current','float','float'],
    ['MC2VEL','mc2Velocityrpm','mc2Velocityms','float','float'],
    ['BP_ISH','bpsCoulomb','bpsCurrent','float','float'],
    ['BP_VMX','bpsMaxVoltageCell','bpsMaxVoltageValue','float','float'],
    ['BP_VMN','bpsMinVoltageCell','bpsMinVoltageValue','float','float'],
    ['BP_TMX','bpsMaxTempCell','bpsMaxTempValue','float','float'],
    ['DC_DRV','dcMotorVelocitySetpoint','dcMotorCurrentSetpoint','float','float'],
    ['DC_SWC','dcSwitchStateChange','dcSwitchPosition','boolean','boolean'],
    ['AC_MP1', 'acM1Current', 'acM1Voltage', 'float', 'float'],
    ['AC_MP2', 'acM2Current', 'acM2Voltage', 'float', 'float'],
    ['AC_MP3', 'acM3Current', 'acM3Voltage', 'float', 'float'],
    ['AC_ISH', 'acVoltage', 'acCurrent', 'float', 'float'],
    ['AC_TMX', 'acTempCell', 'acTempValue', 'float', 'float']
]

const switchNames = [
    'Charge',
    'Enable',
    'Reverse',
    'Break',
    'Regen',
    'Turtle',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
]

const prevTime = 0;
const prevAmps = 0;
const prevWatts = 0;

function getFloat(hex) {
    if (hex.includes('HHHHHHHH') || hex.length > 8) {
        return -1000000;
    }
    var buf = ByteBuffer.fromHex(hex, true);
    return buf.readFloat().toFixed(4);
}

function getInt(hex) {
    return parseInt(hex, 16);
}

function hexToBin(hex) {
    return ("0000" + (parseInt(hex, 16)).toString(2)).substr(-4);
}

function getIndex(key) {
    for (var i = 0; i < packets.length; i++) {
        if (packets[i][0] == key){
            return i;
        }
    }
}

function generateCode(data, title) {
    var y = data.join(',');
    var xarr = new Array();
    for (var i = 0; i < data.length; i++) {
        xarr.push(i+1);
    }
    var x = xarr.join(',');
    var data = 'var data = [{ x:['+ x +'],y:[' + y + '],type: "scatter"}];Plotly.newPlot("graph", data);document.getElementById("title").innerText="' + title +'";';
    return data;
}

function setValue(element, packet, index, value) {
    if (timer != null) {
        window.clearTimeout(timer);
        document.getElementById('connection').innerText = "Connected";
    }
    timer = window.setTimeout(() => {
        document.getElementById('connection').innerText = "Lost Connection";
    }, 1500);
    if (packet[index+2] == 'float') {
        value = getFloat(value);
    }
    else if (packet[index+2] == 'int') {
        value = getInt(value);
    }

    switch(packet[index]) {
        case 'bpsCurrent':
            value /= 1000;
            break;
        case 'dcMotorCurrentSetpoint':
            value = (value * 100).toFixed(2);
            break;
        case 'mc1Velocityms':
        case 'mc2Velocityms':
            value *= 2.23694;
            break;
        case 'bpsCoulomb': 
            soc = Math.abs(value / -115000000) * 100;
            console.log(soc);
            value = ((value / 3600000)).toFixed(5);
            w = (document.getElementById('mc1Voltage').getAttribute('data-value') * value).toFixed(5);
            document.getElementById('bpsWatts').innerText = w;
            document.getElementById('bpsSOC').setAttribute('data-value', soc);
            break;
        case 'bpsMaxVoltageCell':
        case 'bpsMinVoltageCell':
        case 'bpsMaxTempCell':
            value = parseFloat(value).toFixed(0);
            break;
        case 'acCurrent':
        case 'acM1Voltage':
        case 'acM2Voltage':
        case 'acM3Voltage':
        case 'acM1Current':
        case 'acM2Current':
        case 'acM3Current':
            value /= 1000;
            break;
    }

    if (element.tagName == 'CANVAS') {
        element.setAttribute('data-value', value)
    }
    else {
        element.innerText = value;
    }

    logs[(getIndex(packet[0]) * 2) + index - 1][logCount] = value;

}

module.exports = {
    readLine: function(line) {
        var outputArray = line.split(',');
        var key = outputArray[0];
        if (key.includes('UVWXYZ')) {
            logCount++;
        }
        else if(key == 'TL_TIM') {
            document.getElementById('timer').innerText = outputArray[1];
        }
        else {
            if (outputArray[1]) {
                var first = outputArray[1].substring(2).trim();
            }
            if (outputArray[2]) {
                var second = outputArray[2].substring(2).trim();
            }
            var telemetryPacket = packets.find(packet => {
                return packet[0] == key;
            });
    
            if (telemetryPacket) {
                if (telemetryPacket[3] == 'boolean' || telemetryPacket[4] == 'boolean') {
                    var switches = '';
                    first.split('').forEach(hex => {
                        switches += hexToBin(hex);
                    });
                    switches = switches.split('');
                    switches = switches.map(s => {
                        if (s == 1) {
                            return 'On';
                        }
                        return 'Off';
                    });
    
                    var element = document.getElementById('driverController');
    
                    switchNames.forEach((name, i) => {
                        if (name) {
                            var id = name.replace(' ', '').toLowerCase();
                            if (existing = document.getElementById(id)) {
                                existing.innerText = switches[i];
                            }
                            else {
                                var row = document.createElement('tr');
                                var title = document.createElement('td')
                                title.innerText = name;
                                var data = document.createElement('td')
                                data.innerText = switches[i];
                                data.classList.add('switch');
                                data.id = id;
                                row.appendChild(title);
                                row.appendChild(data);
                                element.appendChild(row);
                            }
                        }
                    })
                }
                else {
                    if (element = document.getElementById(telemetryPacket[1])) {
                        setValue(element, telemetryPacket, 1, first);
                    }
            
                    if (element = document.getElementById(telemetryPacket[2])) {
                        setValue(element, telemetryPacket, 2, second);
                    }
                }
            }
        }
    },
    printLog: function() {
        console.log(logs);
    },
    fillLogOptions: function() {
        const element = document.getElementById('logOptions');
        packets.forEach(packet => {
            option1 = document.createElement('option');
            option1.innerText = packet[1];
            option2 = document.createElement('option');
            option2.innerText = packet[2];
            element.appendChild(option1);
            element.appendChild(option2);
        });
    },
    openLog: function() {
        var element = document.getElementById('logOptions')
        var currentLog = element.selectedIndex;
        var index = (currentLog % 2) + 1;
        var packageIndex = Math.round(currentLog / 2);
        graph = window.open('./log.html', 'Graph');
        graph.eval(generateCode(logs[(packageIndex * 2) + index - 1], element.options[currentLog].innerText.toUpperCase()));
    },
    downloadCSV: function() {
        var rows = []
        for (var i = 0; i < logs.length; i++) {
            rows.push(packets[Math.floor(i/2)][(i%2)+1] + ',' + logs[i].join(','));
        }
        var csvString = rows.join('\n');
        var a = document.createElement('a');
        a.href = encodeURI('data:text/csv;charset=utf-8,' + csvString);
        a.target = '_blank';
        a.download = (new Date().toISOString().slice(0, -5) + '.csv');

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },
    snapshot: function() {
        var lap = document.getElementById('time');
        var amps = document.getElementById('amphour');
        var watts = document.getElementById('watthour');
        this.prevTime = parseFloat(lap.innerText, 10);
        this.prevAmps = parseFloat(amps.innerText, 10);
        this.prevWatts = parseFloat(watts.innerText, 10);
        lap.innerText = document.getElementById('timer').innerText;
        amps.innerText = document.getElementById('bpsCoulomb').innerText;
        watts.innerText = document.getElementById('bpsWatts').innerText;
    
        document.getElementById('lapTime').innerText = prevTime;
        document.getElementById('amphourDiff').innerText = (parseFloat(amps.innerText, 10) - this.prevAmps).toFixed(5);
        document.getElementById('watthourDiff').innerText = (parseFloat(watts.innerText, 10) - this.prevWatts).toFixed(5);
    }
}