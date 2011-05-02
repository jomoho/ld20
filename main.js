
define(['./jo/src/jo', 
        './jo/src/Game', 
        './jo/src/TileMap',
        './jo/src/math2d',
        './objects/Actor',
        './objects/Clone',
        './levels',
        './jo/src/cookies'], 
		function(jo, Game, Map, m2d, Actor, Clone, levels, cookies){
	
	//helps with the debugging in firebug
	$jo = jo;
	
	var game = jo.game= new Game({ name: '#canvas', fullscreen: true, fps: 30});
	
	jo.edit = false;
	jo.dev = false;
	game.setup(function(){
		game.load(['img/test.png', 
		           'img/player.png',
		           'img/player_record.png',
		           'img/player_shadow.png',
		           'img/device.png',
		           'img/tileset.png',
		           'sfx/ja.wav',
		           'sfx/rrm.wav',
		           'sfx/clkclk.wav',
		           'sfx/uh.wav',
		           'sfx/woo.wav',
		           'music/LD20-replay_2.mp3']);
		jo.input.reserved.push(jo.input.CTRL);
		jo.input.reserved.push(jo.input.ALT);
		jo.input.reserved.push(jo.input.SHIFT);
		jo.input.reserved.push(jo.input.TAB);
		jo.input.reserved.push(jo.input.SPACE);
		jo.input.reserved.push(jo.input.ENTER);
		jo.input.reserved.push(jo.input.WHEEL_UP);
		
	});
	var start = function(){
		game.state = 'start';
		game.cam =new jo.Camera();
		
	};
	game.ready(function(){
		start();
		game.ts = new jo.TileSet([0,1,2,3, [{i:4, t:800},{i:5, t: 600}]], 64,64, jo.files.img.tileset);
		game.map = new Map(game.ts, 128, 32, null);
		for(var i=0; i< 10; i++){
			game.map.put(i,5,{index: i%4});
		}
		game.map.put(10,4,{index: i%4});
		game.map.put(11,4,{index: i%4});
		game.map.put(12,4,{index: i%4});
		game.add(new Actor({name: 'player', position: new jo.Point(100, 64)}), 'player');
		game.records= [];
		game.loadLevel(levels['start'], true);
		if(! jo.dev){
			jo.files.music['LD20-replay_2'].play();
		}
		game.device= new jo.Animation([1,1,1], 80,42, jo.files.img.device);

	});

	
	var caption = function(msg){
		jo.screen.text({ fill: jo.clr.white, stroke: 0}, new jo.Point(64, 32), msg);
	};
	game.OnDraw(function() {
		jo.screen.clear('#a5e63f');
		if(!jo.edit ){
			this.adjustcam();
		}
		var p = game.cam.toWorld();
		game.map.draw({x: p.x, y: p.y, width: jo.screen.width, height:jo.screen.height}, new jo.Point(0,0), jo.screen);
		if(game.level.device ){
			var fr = 0;
			if(recording){
				fr=2;
			}
			game.device.draw({frame: fr}, new jo.Point(32, 32), jo.screen);
		}
		
		if(jo.edit && jo.dev){
			for(var i in game.tiles){
				jo.screen.rect({fill:game.tiles[i].hit,stroke: 'yellow'}, game.cam.toScreen(game.tiles[i].pos), 64,64);
			}
			game.drawEdit();	
			caption('Edit Mode | FPS: '+jo.screen.fps);
			jo.files.img.test.draw({angle: (jo.screen.frames/60)*Math.PI,pivot: 'center'}, new jo.Point(32, 32), jo.screen);
		}		
	});
	game.adjustcam = function(){
		game.centerCam(this.get('player').pos.clone());
	};
	game.centerCam = function(p){
		var half = new jo.Point(jo.screen.width / 2, jo.screen.height*0.7);
		game.cam.copy(p.minus(half));
		var mf = this.map.getFrame();
		
		game.cam.copy(new jo.Point(
				Math.min(mf.width - jo.screen.width, Math.max(0,game.cam.x)),									
				Math.min(mf.height - jo.screen.height, Math.max(-128, game.cam.y))
		));
		
		
		//game.cam.x = Math.min(mf.width - jo.screen.width, Math.max(mf.x, game.cam.x));
		//game.cam.y = Math.min(mf.height - jo.screen.height, Math.max(mf.y, game.cam.y));
	};
	game.drawEdit= function(){
		game.map.tileSet.draw({tile: pal}, new jo.Point(jo.screen.width-96, 32), jo.screen);
	};

	game.loadLevel = function(level, init){
		var lvl = JSON.parse(level.json, jo.Object.revive);
		game.map = new Map(game.ts, lvl.width, lvl.height, lvl.data);
		
		game.objects = lvl.objects;
		
		game.level = level;
		game.level.lvl= lvl;
		if(init){
			game.initLevel();
		}
		return game.level;
	};
	game.initLevel= function(){
		game.records = [];
		game.enemies = [];
		game.switches = [];
		for(var i in game.objects){
			if(game.level.lvl.objects[i].type === 'record'){
				game.records.push(i);
			}else if(game.level.lvl.objects[i].type === 'enemy'){
				game.enemies.push(i);
			}else if(game.level.lvl.objects[i].type === 'switch'){
				game.switches.push(i);
			}
		}
		game.level.start();
		game.resetRecording();
	};
	game.saveLevel = function(){
		var lvl = {};
		lvl.width = game.map.width;
		lvl.height = game.map.height;
		//
		lvl.data = game.map.data;
		lvl.objects = {};
		for(var i in game.objects){
			lvl.objects[i] = game.objects[i];
		}
		lvl.json = JSON.stringify(lvl);
		
		game.loadLevel(lvl);
		return lvl;
		
	};
	game.stopLevel= function(){
		game.loadLevel(game.level, false);
		game.enemies = [];
		game.switches = [];
		for(var i in game.records){
			game.add(new Clone({name: 'record'+i, position: game.records[i][0].pos.clone()}), 'record'+i);
		}
		for(var i in game.objects){
			if(game.level.lvl.objects[i].type === 'enemy'){
				game.enemies.push(i);
			}else if(game.level.lvl.objects[i].type === 'switch'){
				game.switches.push(i);
			}
		}
	};

	game.levelDone = function(){
		game.loadLevel(levels[game.level.next], true);
		jo.cookies.setCookie('LD20Balooga03',game.level.next, 60);
		jo.files.sfx.woo.play();
	};
	var recording = false;
	var current_rec = 0;
	var rec_frame = 0;
	game.resetRecording =function(){
		recording = false;
		current_rec = game.records.length;
		rec_frame = 0;
	};
	game.stopRecording= function(){
		recording=false;
		game.get('record'+current_rec).rec=false;
		current_rec+=1;
		game.stopLevel();
		rec_frame=0;
		game.get('player').rec=false;
	};
	game.startRecording= function(){
		recording = true;
		game.records[current_rec]= [];
		game.add(new Clone({name: 'record'+current_rec, position: game.get('player').pos.clone()}), 'record'+current_rec);
		game.get('record'+current_rec).rec=true;
		game.get('player').rec=true;
	};
	game.OnUpdate(function(ticks){
		game.map.update(ticks);
		if(jo.input.once('E')){
			jo.edit= !jo.edit;
			game.level.device=true;
		}
		if(jo.edit && jo.dev){
			this.editControls();
			this.controls();
		}else{			
			this.controls();
		}
		
		this.handleCollision();
		
		if(recording){
			var p= game.get('player');
			game.records[current_rec].push({pos: p.pos.clone(), fr: p.fr});			
		}
		if(recording || current_rec>0){
			rec_frame+=1;
		}
		for(var i in game.records){
			var f = Math.min(game.records[i].length-1, rec_frame);
			game.objects['record'+i].pos = game.records[i][f].pos;
			game.objects['record'+i].fr = game.records[i][f].fr;
		}
			
	});

	game.controls = function(){
		this.player = this.get('player');		
		if(jo.input.once('SPACE')){
			this.player.jump();
			$('#popup').hide();
		}
		if(jo.input.once('ESC')){
			this.player.jump();			$('#popup').hide();
		}
		if(jo.input.k('RIGHT')){
			this.player.side(1);
		}else if(jo.input.k('LEFT')){
			this.player.side(-1);
		}else{
			this.player.stand();
		}
		if(!recording && jo.input.once('SHIFT') && game.level.device){
			jo.files.sfx.clkclk.play();
			game.startRecording();
		}else if(recording && jo.input.once('SHIFT') && game.level.device){
			jo.files.sfx.rrm.play();
			game.stopRecording();
		}
	};
	var pal = 0;
	game.editControls= function(){
		//player.pos.copy(game.cam.toWorld(jo.input.mouse));
		if(jo.input.k('D') ){
			jo.log(game.map.data);
		}
		if(jo.input.once('P') ){
			var lvl = game.saveLevel();
			jo.log(lvl.json);
		}
		if(jo.input.once('R') ){
			game.resetRecording();
		}
		if(jo.input.k('MOUSE1') && (jo.input.k('CTRL')|| jo.input.k('ALT')) ){
			game.cam.subtract(jo.input.mouseMovement());
		}else if(jo.input.k('MOUSE1')){
			var p=game.cam.toMap(jo.input.mouse);
			game.map.put(p.x, p.y, {index: pal});
		}
		if(jo.input.k('MOUSE2')){
			var p=game.cam.toMap(jo.input.mouse);
			game.map.put(p.x, p.y, {index: -1});
		}
		if(jo.input.once('TAB')){
			pal = (pal+1)%5;
		}
	};
	game.handleCollision = function(){	
		this.mapCollide(game.map, this.get('player'));
		
		for(i in this.enemy){
			this.mapCollide(game.map, this.get(enemy[i]));
		}
		
		for(i in this.records){
			if(i != current_rec){
				game.actorCollide(this.get('player'), this.get('record'+i));
			}			
		}
	};
	game.actorCollide = function(actor, b){
		if(m2d.intersect.boxBox(b, actor)){
			if(b.pos.y < actor.pos.y+(actor.height*1.1) && actor.v().y>=0 && actor.pos.y <b.pos.y
					&& (actor.pos.x+actor.width >b.pos.x && actor.pos.x <b.pos.x+b.width)){
				actor.pos.y = b.pos.y - actor.height;				
				actor.hit();			
			}
			else if(b.pos.y+b.height > actor.pos.y && actor.pos.y+actor.height >b.pos.y+b.height 
					&& !actor.wall && (actor.pos.x+actor.width <b.pos.x+b.width || actor.pos.x >b.pos.x)){
				//actor.pos.y = b.pos.y + b.height;
				}else if(b.pos.y+b.height > actor.pos.y && b.pos.y < actor.pos.y+(actor.height ) ){
				if(b.pos.x < actor.pos.x+actor.width && actor.v().x>0 ){
					actor.pos.x = b.pos.x-actor.width;
				}else if(b.pos.x+b.width > actor.pos.x && actor.v().x<0){
					actor.pos.x = b.pos.x+b.width;					
				}
			}			
			
		}
	};
	game.mapCollide = function(map, actor){
		var tiles = game.tiles = map.getIntersection({x:actor.pos.x, y: actor.pos.y, width: actor.width, height: actor.height});
		var wallhit = false, groundhit=false, ceilhit=false;;
		
		for(var i in tiles){
			if(tiles[i].index >= 0 && m2d.intersect.boxBox(tiles[i], actor)){				
				if(tiles[i].index == 4){
					game.levelDone();
					jo.log('level done');
				}else{
					
					tiles[i].hit = "yellow";
					if(tiles[i].pos.y < actor.pos.y+(actor.height*1.1) && actor.v().y>=0 && actor.pos.y <tiles[i].pos.y
							&& (actor.pos.x+actor.width >tiles[i].pos.x && actor.pos.x <tiles[i].pos.x+tiles[i].width)){
						actor.pos.y = tiles[i].pos.y - actor.height;
						groundhit=true;
					}
					else if(tiles[i].pos.y+tiles[i].height > actor.pos.y && actor.pos.y+actor.height >tiles[i].pos.y+tiles[i].height 
							&& !actor.wall && (actor.pos.x+actor.width <tiles[i].pos.x+tiles[i].width || actor.pos.x >tiles[i].pos.x)){
						//actor.pos.y = tiles[i].pos.y + tiles[i].height;
						ceilhit=true;
					}else if(tiles[i].pos.y+tiles[i].height > actor.pos.y && tiles[i].pos.y < actor.pos.y+(actor.height ) ){
						if(tiles[i].pos.x < actor.pos.x+actor.width && actor.v().x>0 ){
							actor.pos.x = tiles[i].pos.x-actor.width;
							wallhit = true;
						}else if(tiles[i].pos.x+tiles[i].width > actor.pos.x && actor.v().x<0){
							actor.pos.x = tiles[i].pos.x+tiles[i].width;
							wallhit = true;
						}
					}	
				}				
			}else{
				tiles[i].hit=0;
				
			}
		}
		actor.wall = wallhit;
		actor.ground=groundhit;
		
		var mf = map.getFrame();
		actor.pos.x = Math.min(mf.width-actor.width,Math.max(0,actor.pos.x));
		actor.pos.y = Math.min(mf.height,Math.max(0,actor.pos.y));
		if(actor.pos.y > mf.height-actor.height){
			game.stopLevel();
		}

	};
});