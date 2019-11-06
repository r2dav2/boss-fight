var socket = io.connect('http://100.14.69.172:25565');

var pointerLocked = false;
document.addEventListener('pointerlockchange', () => {
	pointerLocked = !pointerLocked;
});

var groundLevel = 0;

var player = new Player();

var loader = new THREE.GLTFLoader();
var raycaster = new THREE.Raycaster();

var scene = new THREE.Scene();
scene.background = new THREE.Color('white');
scene.fog = new THREE.Fog('white', 7500, 25000);

var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 15, 25000);

var renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var sunlight = new THREE.DirectionalLight('white', 0.75);
sunlight.position.set(10000, 10000, 10000);
sunlight.target.position.set(0, 0, 0);
sunlight.castShadow = true;
scene.add(sunlight);

var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.8);
scene.add(hemiLight);

var settings = {
	xVertices: 100,
	yVertices: 100
}

var texture = THREE.ImageUtils.loadTexture('img/grass.jpg');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(36, 36);

var geometry = new THREE.PlaneGeometry(10000, 10000, settings.xVertices, settings.yVertices);
var material = new THREE.MeshLambertMaterial({map: texture});
var ground = new THREE.Mesh(geometry, material);
ground.rotation.x = - Math.PI / 2;

function generateHills(xVert, yVert, hillLow = -200, hillHigh = 200) {
	var hills = [];
	var size = Math.hypot(xVert, yVert);
	var hillMin =  size / 4;
	var hillPlus = size / 12;
	var hillCount = Math.round(hillMin + Math.random() * hillPlus);

	for (var i = 0; i < hillCount; i++) {
		var hill = {};
		hill.height = Math.round(hillLow + (hillHigh - hillLow) * Math.random());
		hill.x = Math.round(Math.random() * xVert - xVert / 2);
		hill.y = Math.round(Math.random() * yVert - yVert / 2);

		hills.push(hill);
	}

	return hills;
}

var hills = generateHills(settings.xVertices, settings.yVertices);
const scale = 1;

ground.geometry.vertices.forEach((vertice, i) => {
	var vertX = vertice.x / settings.xVertices,
	vertY = vertice.y / settings.yVertices;

	hills.forEach(hill => {
		var dist = Math.hypot(vertX - hill.x, vertY - hill.y);
		
		var delta = Math.max(0, Math.abs(hill.height) - Math.pow(dist, 2)) * scale * Math.sign(hill.height);
		vertice.z += delta;
	});
});

ground.castShadow = true;
ground.receiveShadow = true;
ground.geometry.computeVertexNormals();

scene.add(ground);

var models = {};

function PlayerCharacter() {
	this.object = models.elf.clone(); 
	scene.add(this.object);

	this.object.scale.x = this.object.scale.y = this.object.scale.z = 40;

	return this;
}

player.setPosition({y: player.minY, z: 1000});

var playerCharacters = {};
loader.load('models/elf/scene.gltf', gltf => {
	models.elf = gltf.scene;
});

$(document).ready(() => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	$(renderer.domElement).click(function(e) {
		if (pointerLocked) return ;
		this.requestPointerLock = this.requestPointerLock ||
					     this.mozRequestPointerLock ||
					     this.webkitRequestPointerLock;
		this.requestPointerLock();
	});
	
	animate();
});

var euler = new THREE.Euler(0, 0, 0, 'YXZ');

$(document).mousemove(e => {
	if (!pointerLocked) return ;

	player.rotateView(-e.originalEvent.movementX * player.mouseSens, -e.originalEvent.movementY * player.mouseSens);
});

$(window).resize(() => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

var keysDown = [];
$(document).keydown(e => {
	keysDown[e.keyCode] = true;
});

$(document).keyup(e => {
	keysDown[e.keyCode] = false;
});

$(document).keypress(e => {

});

socket.on('update-players', players => {
	if (models.elf) {
		for (var player in players) {
			player = players[player];
			if (player.id != socket.id) {
				if (!playerCharacters[player.id]) playerCharacters[player.id] = new PlayerCharacter();
				var playerChar = playerCharacters[player.id];
				if (player.position) {
					playerChar.object.position.x = player.position.x;
					playerChar.object.position.y = player.position.y;
					playerChar.object.position.z = player.position.z;
				}
				if (player.rotation) {
					playerChar.object.rotation.x = player.rotation.x;
					playerChar.object.rotation.y = player.rotation.y;
					playerChar.object.rotation.z = player.rotation.z;
				}
			}
		}
	} else console.log('loading models');
});

socket.on('remove-player', id => {
	if (playerCharacters[id] != undefined) {
		scene.remove(playerCharacters[id].object);
		delete playerCharacters[id];
	}
});

function getMapIndex(x, y) {
	var level = (settings.yVertices / 2 + y) * (1 + settings.xVertices);
	return Math.round(level + x + settings.xVertices / 2);
}

var mapX, mapY, mapIndex;

function animate() {
	var time = new Date();
	var dt = (time - lastLoop) / 1000;
	lastLoop = time;

	requestAnimationFrame(animate);

	player.handleControls(dt);

	renderer.render(scene, camera);

	socket.emit('update-player', {
		position: {
			x: player.position.x,
			y: player.position.y,
			z: player.position.z
		},
		rotation: {
			x: 0,
			y: player.view.y + Math.PI,
			z: 0
		}
	});

	mapX = Math.floor(camera.position.x / settings.xVertices);
	mapY = Math.floor(camera.position.z / settings.yVertices);
	mapIndex = getMapIndex(mapX, mapY);

	var vert = ground.geometry.vertices[mapIndex];
	mapHeight = vert.z;

	$('#output-1').html(mapX);
	$('#output-2').html(mapY);
	$('#output-3').html(mapIndex);
	$('#output-4').html(mapHeight);

	player.minY = mapHeight + player.height;
}

var lastLoop = new Date();