/** 
* @fileoverview Flappy Tours game
*
* @author Juan José Capellán
* @version 1.0
*/



    

    //*********************** GLOBAL VARIABLES **********************************/

    var gbs = {

        // Best score
        topScore:0,
        // It's true when actual score > topScore
        newRecord:false,
        // Last game score
        scorePreviousGame:0,
        // True if there is webaudio
        isWebAudio:false,
        windowWidth:0,
        windowHeight:0,
        // div used to calculate the width and height available in the browser
        box:null,
        // Height of the background sprite that represents the ground
        groundHeight:0,
        // Height of the background sprite that represents the mountains
        mountainsHeight:0,
        // Horizontal speed for each pair of pipes
        columnSpeed: -180,
        // X position for new pair of pipes
        posXNewColumn:0,
        // Vertical velocity of the bird in the click event
        birdImpulse:-350,
        gameWidth:362,
        gameHeight:480,
        columnWidth:44,
        antialias:true       
    }

    // Declaration of the game object (width, height, render, id html that contains it)
    var juego = new Phaser.Game(gbs.gameWidth, gbs.gameHeight, Phaser.CANVAS, 'div_juego', null, false, gbs.antialias);


    // ******************************* STATES ******************************************************/
    // *********************************************************************************************/

    /* State scaleAdjustment: Here I define the scale of the game and its adaptation to the screen */
    var scaleAdjustment = {
        create: function () {

            // Scale definition
            gbs.box=document.getElementById('div_juego');
            var factorEscala = gbs.box.clientHeight / juego.height;

            juego.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
            juego.scale.setUserScale(factorEscala, factorEscala);
            juego.scale.setResizeCallback(function (escala, parentrectangulo) {

                if (gbs.windowWidth != gbs.box.clientWidth || gbs.windowHeight != gbs.box.clientHeight) {

                    gbs.windowHeight = gbs.box.clientHeight;
                    gbs.windowWidth = gbs.box.clientWidth;
                    factorEscala = gbs.windowHeight / juego.height;

                    juego.scale.setUserScale(factorEscala, factorEscala);
                    if (gbs.windowWidth > juego.width * factorEscala) {
                        juego.scale.pageAlignHorizontally = true;
                    }
                }
            }, this);

            juego.state.start('loading');
        }
    }



    /* State loading: Here the loading screen is displayed and all game assets are loaded *****/
    var loading = {

        create: function () {
            juego.load.onFileComplete.add(this.fileComplete, this);
            juego.load.onLoadComplete.add(this.loadComplete, this);
            this.loadAssets();
        },

        loadAssets: function () {

            if (juego.device.webAudio) {
                gbs.isWebAudio = true;
                //Load music
                juego.load.audio('musica', 'assets/sonidos/PleasantCreekLoop.mp3', true);

                //Load sounds
                juego.load.audio('suelo', ['assets/sonidos/suelo.wav', 'assets/sonidos/suelo.mp3'], true);
                juego.load.audio('volar', ['assets/sonidos/aleteo.wav', 'assets/sonidos/aleteo.mp3'], true);
                juego.load.audio('gameover', ['assets/sonidos/gameover.mp3', 'assets/sonidos/gameover.wav'], true);
                juego.load.audio('punto', ['assets/sonidos/punto.wav', 'assets/sonidos/punto.mp3'], true);
            }
            // Load atlas with the game images
            juego.load.atlasJSONArray('atl_juego', 'assets/imagenes/lowres_ar133/flappy5.png', 'assets/imagenes/lowres_ar133/flappy5.json');

            // If I don't use the start() method, the load class events doesn't work
            juego.load.start();
        },

        fileComplete: function (progress, cacheKey, success, totalLoaded, totalFiles) {
            document.getElementById('p_carga').innerHTML = progress + '%';
        },

        loadComplete: function () {
            // Hidden current overlay
            document.getElementById('loading').style.display = 'none';

            juego.state.start('inicio');
        }


    }



    /* State inicio: shows the initial screen before the game and initialice some variables *********/
    var inicio = {

        create: function () {

            gbs.groundHeight = juego.cache.getFrameData('atl_juego').getFrameByName('layer3').height;
            gbs.mountainsHeight = juego.cache.getFrameData('atl_juego').getFrameByName('layer2').height;
            // Sky        
            juego.add.image(0, 0, 'atl_juego', 'layer1');
            // Mountains
            juego.add.image(0, juego.height - gbs.groundHeight - gbs.mountainsHeight + 10, 'atl_juego', 'layer2');
            // Ground
            juego.add.image(0, juego.height - gbs.groundHeight, 'atl_juego', 'layer3');

            //Global variables initialization
            gbs.topScore = (getCookie('best') != '') ? parseInt(getCookie('best')) : 0;

            // Shows the UI of this state
            document.getElementById('inicio').style.display = 'block';


        }

    }

    /* State "inGame" : aquí es donde se puede jugar la partida */
    var inGame = {

        create: function () {
            var esto = this;

            // True if the bird has collided
            this.birdCollided = false;

            /* This variable prevents repeated scoring when going through the pipes. As soon as the pipes pass, it becomes true,
            /* and when they leave the screen it is reset to false. All in the resetColumns() method. */
            this.birdHasScored = false;

            // Game score
            this.score = 0;

            /* Modify the limits of the game world, which by default is a rectangle with origin in 0.0 and the size of the game.
            /* This solves collisions with the ground.*/
            juego.world.bounds.height = juego.height - 68;

            //Iniciamos motor de físicas
            juego.physics.startSystem(Phaser.Physics.ARCADE);

            if (gbs.isWebAudio) {
                // Background music
                this.music = juego.add.audio('musica', 0.4);
                this.music.play();
                this.music.onStop.add(function () {
                    this.music.play()
                }, this);

                // Sound effects
                this.suelo = juego.add.audio('suelo', 1);
                this.volar = juego.add.audio('volar', 1);
                this.snd_gameover = juego.add.audio('gameover', 1);
                this.snd_punto = juego.add.audio('punto', 1);
            }

            ////////// Parallax effect
            this.speedBackground1 = -10;
            // Sky
            this.background0 = juego.add.image(0, 0, 'atl_juego', 'layer1');
            // Mountains
            this.background1 = juego.add.tileSprite(0, juego.height - gbs.groundHeight - gbs.mountainsHeight + 10, juego.width, gbs.mountainsHeight, 'atl_juego', 'layer2');
            this.background1.autoScroll(this.speedBackground1, 0);


            ////////// Columns group
            this.columns = juego.add.group();
            this.columns.enableBody = true;
            this.columns.physicsBodyType = Phaser.Physics.ARCADE;
            // Horizontal space between columns
            this.columnsSpace = 200;
            this.columnsNumber = 2;
            // Position X for a new pair of pipes
            gbs.posXNewColumn = (this.columnsNumber - 1) * (this.columnsSpace + gbs.columnWidth) + this.columnsSpace;
            // Vertical space between pipes
            this.pipesGap = Math.round((juego.height * 100) / 480);

            // Adding elements to columns group
            for (var i = 0; i < esto.columnsNumber; i++) {
                var ceilingPipeY = -(370 * juego.height / 600) + Math.random() * 130;
                var ceilingPipe = this.columns.create(juego.width + 50 + i * (gbs.columnWidth + this.columnsSpace), ceilingPipeY, 'atl_juego', 'tuberia');
                ceilingPipe.anchor.setTo(0, 0.5);
                ceilingPipe.y += ceilingPipe.height / 2;
                // When flipping vertically "bottom" is swapped with "top" in the sprite properties
                ceilingPipe.scale.y = -1;
                var floorPipe = this.columns.create(juego.width + 50 + i * (gbs.columnWidth + this.columnsSpace), ceilingPipe.top + this.pipesGap, 'atl_juego', 'tuberia');
                ceilingPipe.body.velocity.x = gbs.columnSpeed;
                floorPipe.body.velocity.x = gbs.columnSpeed;
            }


            //////////// Foreground
            esto.background2 = juego.add.tileSprite(0, juego.height - gbs.groundHeight, juego.width, gbs.groundHeight, 'atl_juego', 'layer3'); //capa3 (tierra)
            esto.background2.autoScroll(gbs.columnSpeed, 0);


            //////////// Bird
            esto.bird = juego.add.sprite(100, juego.world.centerY, 'atl_juego', 'pato1');
            esto.bird.anchor.setTo(0.5, 0.5);
            esto.bird.animations.add('flying', ['pato1', 'pato2', 'pato3', 'pato4', 'pato5', 'pato6', 'pato7', 'pato8'], 10, true);
            esto.bird.animations.play('flying');
            juego.physics.arcade.enable(this.bird);
            esto.bird.body.gravity.y = 1200;
            esto.bird.body.collideWorldBounds = true;
            esto.bird.body.bounce.y = 0.3;


            // Click/touch event
            juego.input.onDown.add(this.fly, this);

            // Shows actual state UI
            document.getElementById('marcador').innerHTML = '0';
            document.getElementById('enJuego').style.display = 'block';

        },


        update: function () {

            //Bird angle
            if (this.bird.angle < 20) {
                this.bird.angle += 1;
            }

            // Checks the bird collision with columns
            juego.physics.arcade.collide(this.bird, this.columns, this.columnCollision, null, this);

            // resetColumn() checks if any pipe has left the screen and resets it
            this.resetColumn();
        },

        // Executed on onDown event
        fly: function () {
            this.bird.body.velocity.y = gbs.birdImpulse;
            juego.add.tween(this.bird).to({
                angle: -20
            }, 150).start();
            if (gbs.isWebAudio)
                this.volar.play();
        },


        resetColumn: function () {
            var esto = this;
            var ceilingPipey;
            var floorPipey;
            this.columns.forEach(function (item) {
                if (item.body.x < (-gbs.columnWidth)) {
                    if (item.anchor.y == 0.5) { // Only top pipes have this anchor
                        ceilingPipey = Math.round(-(175 * juego.height / 600) + Math.random() * (320 * juego.height / 600));
                        item.reset(gbs.posXNewColumn, ceilingPipey);
                        ceilingPipey = item.top;
                    } else {
                        floorPipey = ceilingPipey + esto.pipesGap;
                        item.reset(gbs.posXNewColumn, floorPipey);
                        esto.birdHasScored = false;
                    }

                    item.body.velocity.x = gbs.columnSpeed;
                } else {
                    if (item.body.x < (esto.bird.x - item.width) && !esto.birdHasScored) {
                        //Save score
                        if (gbs.isWebAudio)
                            esto.snd_punto.play();
                        esto.score += 1;
                        document.getElementById('marcador').innerHTML = esto.score;
                        esto.birdHasScored = true;
                    }
                }

            });
        },

        //object1 is the bird and object2 is the pipe
        columnCollision: function (object1, object2) {
            //If the bird has already collided before then return
            if (this.birdCollided) {
                return;
            }

            this.birdCollided = true;

            juego.input.onDown.removeAll();
            if (gbs.isWebAudio) {
                this.suelo.play();
                this.music.onStop.removeAll();
                this.music.stop();
                this.snd_gameover.play();
            }
            this.stopScene();


            object1.body.angularVelocity = -250;
            object1.body.velocity.x = -30;
            object1.body.collideWorldBounds = false;
            object2.body.velocity.x = 0;
            object2.body.velocity.y = 0;
            juego.camera.shake(0.02, 200);
            gbs.scorePreviousGame = this.score;
            this.checkRecord();
            juego.time.events.add(4000, function () {
                //Hidden actual state UI
                document.getElementById('enJuego').style.display = 'none';
                juego.state.start('gameover');
            });
        },

        stopScene: function () {
            this.background1.stopScroll();
            this.background2.stopScroll();
            this.columns.setAll('body.velocity.x', 0);
        },

        checkRecord: function () {
            if (this.score > gbs.topScore) {
                setCookie('best', this.score, 365);
                gbs.topScore = this.score;
                gbs.newRecord = true;
            }
        }
    }

    /* State gameOver : shows player final score */
    var gameOver = {
        create: function () {
            // Sky
            juego.add.image(0, 0, 'atl_juego', 'layer1');
            // Mountains
            juego.add.image(0, juego.height - gbs.groundHeight - gbs.mountainsHeight + 10, 'atl_juego', 'layer2');
            // Ground
            juego.add.image(0, juego.height - gbs.groundHeight, 'atl_juego', 'layer3');

            // Game Over Image
            document.getElementById('gameOver').style.display = 'block';

            // Score 
            var textopuntuacion = '';
            if (gbs.newRecord) {
                gbs.newRecord = false;
                textopuntuacion = gbs.topScore;
                document.getElementById('mensaje').innerHTML = 'NEW RECORD !!!';
            } else {
                textopuntuacion = gbs.scorePreviousGame;            
            }
            document.getElementById('recuento').innerHTML = textopuntuacion;
            document.getElementById('bestscore').innerHTML = gbs.topScore;

            // Click to exit
            juego.input.onDown.add(function () {
                // Hidden actual overlay
                document.getElementById('gameOver').style.display = 'none';
                document.getElementById('mensaje').innerHTML = '';
                juego.state.start('inicio');
            });

        }
    }


    /* Adding the states to game object (juego)*/    
    juego.state.add('ajusteEscala', scaleAdjustment);
    juego.state.add('loading', loading);
    juego.state.add('inicio', inicio);
    juego.state.add('principal', inGame);
    juego.state.add('gameover', gameOver);
    juego.state.start('ajusteEscala');


    /************************** DOM BUTTONS **************************************/
    function botonPlay() {
        document.getElementById('inicio').style.display = 'none';
        juego.state.start('principal');
    }

    function cerrarlayer() {
        document.getElementById('creditos').style.display = 'none';
    }

    function botonCredits() {
        document.getElementById('creditos').style.display = 'block';
    }

    function cerrarayuda() {
        document.getElementById('help').style.display = 'none';
    }

    function botonAyuda() {
        document.getElementById('help').style.display = 'block';
    }


    /***************************** COOKIES ******************************/

    /* Create a cookie.
    // c_name: cookie name (string)
    // c_value: cookie value (string)
    // c_days: days to delete the cookie (int)*/
    function setCookie(c_name, c_value, c_days) {
        var d = new Date();
        d.setTime(d.getTime() + (c_days * 24 * 60 * 60 * 1000));
        var expires = 'expires=' + d.toUTCString();
        document.cookie = c_name + '=' + c_value + ';' + expires + ';path=/';
    }

    /* Gets the cokkie value 
    // c_name: cookie name */
    function getCookie(c_name) {
        var name = c_name + '=';
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return '';
    }