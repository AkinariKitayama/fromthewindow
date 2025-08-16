import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
const WORKER_BASE = 'https://fromthewindow.akinarikitayama.workers.dev'; 

const grasses = [];
//mainDisplay
const disX = 350;
const disY = 500;
let renderer, camera;

const PHONE_BP = 768;           
let PHONE_SCALE = 1.25;            
let PHONE_MAX_W = 400;          
let PHONE_VIEWPORT_RATIO = 0.65;

//subDisplay
const subdisX = 256;
const subdisY = 256;
let isDragging = false;
let rX = 0;
let rY = 0;
let rZ = 0;
let clickedP = [0,0];

let windDirection = 0.0;
let windSpeed = 1.0;
let weather;
let rainamt = 0;

let mapWindSpeed = 1.0;

let tokyoBtn = document.querySelector('[location = "Tokyo"]');

const grassGroup = new THREE.Group();
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 5, 40);
const material = new THREE.LineBasicMaterial({ color: 0xffffff, fog: true});

//log
let logCityName = document.getElementById("cityName");
let logWindDir = document.getElementById("windDirection");
let logWindSpeed = document.getElementById("windSpeed");
let logRainAmt = document.getElementById("rainAmt");

//rain
let rainCount = 800;
const rainAreaX = 24;
const rainAreaZ = 250;
const rainTopMin = 8, rainTopMax = 14;
const G = 9.8;

//clock
// const clock = document.getElementById("clock");

const rainGroup = new THREE.Group();
let rainGeo, rainLine, rainPositions;

let headX, headY, headZ, dropLen;

let prevTime = 0;

function newGrasses(scene, material) {
    grasses.length = 0;
    grassGroup.clear();
for (let i = 0; i < 290; i++) {
     const x = (Math.random() - 0.5) * 10;
     const z = (Math.random() - 0.3) * 50;
     const points = [];
     const total = 20;
     const height = 1.0 + (Math.random()) * 0.3; 
     for(let j = 0; j < total; j++) {
        points.push(new THREE.Vector3(x, j / (total - 1) * height,z));
        }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.attributes.position.needsUpdate = true;
      const line = new THREE.Line(geometry, material);
      grassGroup.add(line);
      grasses.push({
        geometry, line, baseX: x, baseZ: z, 
        phaseOffset: Math.random() * 0.05, 
        speedFactor:  1.0 + mapWindSpeed * 0.1 + Math.random(),
        noiseSeed: Math.random() * 1000
    });
 }
}

function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(disX, disY);
    renderer.domElement.id = "mainDisplay";
    document.getElementById("WebGL-output").appendChild(renderer.domElement);
    renderer.domElement.style.border = '0.6px solid white';

    camera = new THREE.PerspectiveCamera(20, window.innerWidth/window.innerHeight, 0.1, 1000);
    sizeMainCanvas();
    window.addEventListener("resize", sizeMainCanvas);
    window.addEventListener("orientationchange", sizeMainCanvas);
    camera.position.set(0,1.17,10);
    camera.rotation.set(rX, rY, rZ);

    newGrasses(scene, material);
    scene.add(grassGroup);
    


    function animate(time = 0) {
        requestAnimationFrame(animate);

        sizeMainCanvas();

        const t = time * 0.001;
        const dt = prevTime === 0 ? 0.016 : (time - prevTime) / 1000;
        prevTime = time;
        const windRad = windDirection * Math.PI / 180;
        const windVecX = Math.cos(windRad);
        const windVecZ = Math.sin(windRad);

        camera.rotation.set(rX, rY, rZ);
        // console.log("rX: ", rX, "rY: ", rY);

        grasses.forEach(({ geometry, baseX, baseZ, phaseOffset, speedFactor, noiseSeed}) => {
            const position = geometry.attributes.position.array;
            const totalPoints = position.length / 3;
            const safeLine = Math.max(totalPoints - 1, 1);

            const noiseFreq = 0.6;
            const n01 = noise1D(t * noiseFreq + noiseSeed);
            const n11 = (n01 - 0.5) * 2;
            

            for(let i = 0; i < totalPoints; i++) {
                const index = i * 3;
                const ratio = Math.min(i / safeLine, 1);
                const amplitude = Math.pow(ratio, 3);
                const base = 0.4 * windSpeed * amplitude;
                const yuragi = 0.05 * windSpeed * amplitude
                             * Math.sin(t * speedFactor * (windSpeed * 0.4) + phaseOffset);
                const noiseWobble = 0.06 * windSpeed * amplitude * n11; // ★ amplitude を掛ける
                const swing = Math.max(0, base + yuragi + noiseWobble);
                position[index] = baseX + windVecX * swing;
                position[index + 2] =baseZ + windVecZ * swing;

            }
            geometry.attributes.position.needsUpdate = true;
        });
        updataRain(dt);
        renderer.render(scene, camera);
    }
    // animate();
    requestAnimationFrame(animate);
}
init();

// let canvas = document.getElementById("clock");;
// let ctx = canvas.getContext("2d");


window.addEventListener("load", function() {
 document.getElementById("mainDisplay").addEventListener("mousedown", (event) => {
    isDragging = true;
    clickedP[0] = event.offsetX;
    clickedP[1] = event.offsetY;
});
 document.getElementById("mainDisplay").addEventListener("mouseup", 
    () => {isDragging = false});
 document.getElementById("mainDisplay").addEventListener("mousemove", (event) => {
    if(isDragging) {
        logPosition(event);
    }
 });

window.addEventListener("mouseup", () => {
    isDragging = false;
 });

 const buttons = this.document.querySelectorAll(".locationBtn");
 buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        const cityName = btn.getAttribute("location");
        logCityName.textContent = "city: " + cityName;
        getWindData(cityName, () => {
            newGrasses(scene, material);
        });
    });
 });

//  setClock();
//   setInterval(setClock, 1000);

});

 function logPosition(event) {
//   console.log("offsetX: " + event.offsetX);
//   console.log("offsetY: " + event.offsetY);
    
    let dx = clickedP[0] - event.offsetX;
    let dy = clickedP[1] - event.offsetY;

    const sensiX = 0.0002;
    const sensiY = 0.0001;

    rX += dy * sensiX;
    rY += dx * sensiX;

    clickedP[0] = event.offsetX;
    clickedP[1] = event.offsetY;
 }

 function map(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function getWindData(cityName, callback) {
  const url = `${WORKER_BASE}/api/weather?city=${encodeURIComponent(cityName)}`;
  
  fetch(url, { method: 'GET' })
    .then(res => {
      if (!res.ok) throw new Error(`Worker error: ${res.status}`);
      return res.json();
    })
    .then(data => {
    //   console.log('[from Worker]', data);
      windDirection = (data.wind?.deg ?? 0) - 90;
      if (windDirection < 0) windDirection += 360; 

      // 風速（m/s）
      windSpeed = data.wind?.speed ?? 0;
      mapWindSpeed = windSpeed * 0.5;


      weather = data.weather?.[0]?.main || "";

      if (weather === "Rain") {
        if (typeof data.rain?.["1h"] === "number") {
          rainamt = data.rain["1h"];
        } else if (typeof data.rain?.["3h"] === "number") {
          rainamt = data.rain["3h"] / 3; // 3h を 1h 換算
        } else {
          rainamt = 0;
          rainGroup.remove(rainLine);
        }
      } else {
        rainamt = 0;
        rainGroup.remove(rainLine);
      }

      // 雨のラインを更新
      rainCount = Math.floor(rainamt * 200);
      if (rainCount !== 0) {
        rainGroup.remove(rainLine);
        initRain();
      }


      logWindDir.textContent = `windDir: ${data.wind?.deg ?? '-'}°`;
      logWindSpeed.textContent = `windSpeed: ${windSpeed}`;
      logRainAmt.textContent = `rainAmt: ${rainamt}`;

      if (callback) callback();
    })
    .catch(err => {
      console.error(err);
      logWindDir.textContent = 'windDir: -';
      logWindSpeed.textContent = 'windSpeed: -';
      logRainAmt.textContent = 'rainAmt: -';
    });
}

function initRain() {
    //各粒のヘッド位置と長さ
    headX = new Float32Array(rainCount);
    headY = new Float32Array(rainCount);
    headZ = new Float32Array(rainCount);
    dropLen = new Float32Array(rainCount);

    //LineSegments用にhead位置を全て格納する 3つのheadが2頂点分
    rainPositions = new Float32Array(rainCount * 2 * 3);

    for(let i = 0; i < rainCount; i++) {
        headX[i] = (Math.random() - 0.5) * rainAreaX;
        headZ[i] = (Math.random() - 0.5) * rainAreaZ;
        headY[i] = rainTopMin + Math.random() * (rainTopMax - rainTopMin);

        dropLen[i] = 0.25 + Math.random() * 0.35;
        //最初のフレーム用にテールも仮で埋める（真下方向）
        const idx = i * 6;
        rainPositions[idx] = headX[i];
        rainPositions[idx + 1] = headY[i];
        rainPositions[idx + 2] = headZ[i];
        rainPositions[idx + 3] = headX[i];
        rainPositions[idx + 4] = headY[i] - dropLen[i];
        rainPositions[idx + 5] = headZ[i];
    }

    rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        fog: true,
        opacity: 0.85
    });

    rainLine = new THREE.LineSegments(rainGeo, rainMat);
    rainGroup.add(rainLine);
    scene.add(rainGroup);
}

function updataRain(dt) {
    if(!rainGeo || !rainPositions) return;

    const windPush = windSpeed * 0.8;
    const fallSpeed = 5.0 + windSpeed * 0.5;

    const windRad = windDirection * Math.PI / 180;
    const windVecX = Math.cos(windRad);
    const windVecZ = Math.sin(windRad);

    const vx = windVecX * windPush;
    const vy = -fallSpeed;
    const vz = windVecZ * windPush;


    for(let i = 0; i < rainCount; i++) {
        headX[i] += vx * dt;
        headY[i] += vy * dt;
        headZ[i] += vz * dt;
    

    if(headY[i] < 0) {
        headX[i] = (Math.random() - 0.5) * rainAreaX;
        headZ[i] = (Math.random() - 0.5) * rainAreaZ;   
        headY[i] = rainTopMin + Math.random() * (rainTopMax - rainTopMin);     
    }

    const speedLen = Math.hypot(vx, vy, vz) || 1.0;
    const nx = vx / speedLen, ny = vy / speedLen, nz = vz / speedLen;

    //ヘッドとテールの頂点を書き戻す（真下方向の線）
    const idx = i * 6;

    //head
    rainPositions[idx] = headX[i];
    rainPositions[idx + 1] = headY[i];
    rainPositions[idx + 2] = headZ[i];

    //tail
    const len = dropLen[i];
    rainPositions[idx + 3] = headX[i] - nx * len;
    rainPositions[idx + 4] = headY[i] - ny * len;
    rainPositions[idx + 5] = headZ[i] - nz * len;
}
rainGeo.attributes.position.needsUpdate = true;
}

//noise
function lerp(a, b, t) { 
    //a~bをt(0~1)で移動した値を返す
    return a + (b - a) * t;
}

function smoothStep(t) {
    //補間
    return t * t * (3 - 2 * t);
}

function hash1(i) {
    //iを0~1のランダム値に変換する
    const x = Math.sin(i * 127.1) * 43758.5453;
    return x - Math.floor(x);
}

function noise1D(x) {
    const i0 = Math.floor(x);
    const i1 = i0 + 1;
    const f = x - i0;
    const u = smoothStep(f);
    return lerp(hash1(i0), hash1(i1), u);
}

function setClock() {
    let now = new Date();
    let hours = now.getHours();
    let min = now.getMinutes();
    let sec = now.getSeconds() + now.getMilliseconds() / 1000;

    const cx = canvas.width/2;
    const cy = canvas.height/2;
    const r = Math.min(canvas.width, canvas.height) * 0.4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.arc(cx, cy, r, 0, Math.PI * 2, false);
    ctx.stroke();


  const angH = ((hours % 12) / 12 + min / 720) * Math.PI * 2 - Math.PI / 2; 
  const angM = ((min + sec / 60) / 60) * Math.PI * 2 - Math.PI / 2; 
  const angS = (sec / 60) * Math.PI * 2 - Math.PI / 2;

    const houX = cx + Math.cos(angH) * r * 0.55;
    const houY = cy + Math.sin(angH) * r * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(houX, houY);
    ctx.stroke();

    const minX = cx + Math.cos(angM) * r * 0.8;
    const minY = cy + Math.sin(angM) * r * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(minX, minY);
    ctx.stroke();

    const lenF = r * 0.9;

    const secX = cx + Math.cos(angS) * lenF;
    const secY = cy + Math.sin(angS) * lenF;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(secX, secY);
    ctx.stroke();

}

function sizeMainCanvas() {
    const vw = window.innerWidth;
    const baseW = disX, baseH = disY;
    const baseAspect = baseW / baseH;
    const isPhone = vw <= PHONE_BP;

    let w = baseW;

    if (isPhone) {
        // Candidates for phone width
        const byScale    = Math.floor(baseW * PHONE_SCALE);               
        const byViewport = Math.floor(vw * PHONE_VIEWPORT_RATIO);        
        const capped     = Math.min(byScale, byViewport, PHONE_MAX_W);    
        w = Math.max(baseW, capped);
    }                           

    const h = Math.round(w / baseAspect);

    // Update renderer and camera
    renderer.setSize(w, h); 
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // (optional) debug
    console.log({isPhone, vw, w, h});
}
