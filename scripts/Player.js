function Player(options = {pos: {}}) {
	this.position = {
		x: options.pos.x || 0,
		y: options.pos.y || 0,
		z: options.pos.z || 0
	}

	this.height = options.height || 325;

	this.accel = options.accel || 3500;
	this.offGroundAccel = options.offGroundAccel || 10;
	this.decel = options.decel || 0.025;
	this.offGroundDecel = options.offGroundDecel || 0.99;

	this.jumpHeight = options.jumpHeight || 850;
	this.gravity = options.gravity || window.gravity || 2000;

	this.canMove = options.canMove || true;
	this.controllingCamera = options.controllingCamera || true;

	this.mouseSens = options.mouseSens || 0.002;

	this.minY = window.groundLevel + this.height;

	this.view = new THREE.Euler(0, 0, 0, 'YXZ');
	
	this.forwardVelocity = 0;
	this.upVelocity = 0;
	this.rightVelocity = 0;

	return this;
}

Player.prototype.moveForward = function(dist) {
	var vec = new THREE.Vector3();
	vec.setFromMatrixColumn(camera.matrix, 0);
	vec.crossVectors(camera.up, vec);
	camera.position.addScaledVector(vec, dist);

	this.position = camera.position;
}

Player.prototype.moveRight = function(dist) {
	var vec = new THREE.Vector3();
	vec.setFromMatrixColumn(camera.matrix, 0);
	camera.position.addScaledVector(vec, dist);

	this.position = camera.position;
}

Player.prototype.setPosition = function(pos) {
	if (pos.x != undefined) this.position.x = pos.x;
	if (pos.y != undefined) this.position.y = pos.y;
	if (pos.z != undefined) this.position.z = pos.z;

	camera.position.x = this.position.x;
	camera.position.y = this.position.y;
	camera.position.z = this.position.z;
}

Player.prototype.setView = function(y, x) {
	this.view.y = y;
	this.view.x = x;

	this.view.x = Math.max(- Math.PI / 2, Math.min(Math.PI / 2, this.view.x));
	
	camera.quaternion.setFromEuler(this.view);
}

Player.prototype.rotateView = function(y, x) {
	this.view.y += y;
	this.view.x += x;

	this.view.x = Math.max(- Math.PI / 2, Math.min(Math.PI / 2, this.view.x));
	
	camera.quaternion.setFromEuler(this.view);
}

Player.prototype.handleControls = function(dt) {
	var touchingGround = this.position.y == this.minY;
	var accel = touchingGround ? this.accel : this.offGroundAccel;
	var decel = touchingGround ? this.decel : this.offGroundDecel;

	if (keysDown[87]) this.forwardVelocity += accel * dt;
	if (keysDown[83]) this.forwardVelocity -= accel * dt;
	if (keysDown[68]) this.rightVelocity += accel * dt;
	if (keysDown[65]) this.rightVelocity -= accel * dt;

	if (keysDown[32] && touchingGround) this.upVelocity = this.jumpHeight; 

	this.moveForward(dt * this.forwardVelocity);
	this.moveRight(dt * this.rightVelocity);
	this.setPosition({y: Math.max(this.minY, this.position.y + dt * this.upVelocity)});
	if (touchingGround && this.upVelocity < 0) this.upVelocity = 0;

	this.forwardVelocity *= Math.pow(decel, dt);
	this.rightVelocity *= Math.pow(decel, dt);
	this.upVelocity -= dt * this.gravity;
}