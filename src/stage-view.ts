/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import * as Teams from "@microsoft/teams-js";
import {
    ILiveShareClientOptions,
    LiveShareClient, TestLiveShareHost 
} from "@microsoft/live-share";
import {
    InkingManager,
    InkingTool,
    IUserInfo,
    LiveCanvas,
} from "@microsoft/live-share-canvas";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { IFluidContainer, SharedMap, SharedString } from "fluid-framework";
import * as Utils from "./utils";
import { View } from "./view";
import { getRandomUserInfo } from "./random-userInfo";
import { AzureFunctionTokenProvider } from "./GetFluidToken";

import { AzureClient, AzureClientProps } from "@fluidframework/azure-client";
import { ConfigView } from "./config-view";
import { arcCamera, containerSchema, inSecureClientOptions, remoteClientOptions, SidebarView } from "./sidebar-view";

import "@babylonjs/loaders/glTF";
import { ExecuteCodeAction, ActionManager, Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SceneLoader, AbstractMesh, InterpolateValueAction, StandardMaterial, Color3, FreeCamera, TransformNode } from "@babylonjs/core";


/**
 * Other images
 * https://guitar.com/wp-content/uploads/2020/09/Mark-Knopfler-Dire-Straits-Credit-Mick-Hutson-Redferns@2160x1459.jpg
 * https://guitar.com/wp-content/uploads/2020/09/Mark-Knopfler-Dier-Straits-Suhr-Schecter-Credit-Ebet-Roberts-Redferns@2560x1707.jpg
 */

const appTemplate = `   
    <div id="appRoot">
        <div id="inkingRoot" >
            <img id="backgroundImage" src="https://fllivesharecanvas-dev.azurewebsites.net/cad.png"
                  style="visibility: hidden;">
            <canvas id="blcanvas" style="height: 100%;weight: 100%;"></canvas>
            <div id="inkingHost" ></div>
          </div>     
        <fluent-horizontal-scroll id="scrollPane" >
        <fluent-card style="margin-top: 10px;height: 300px;flex: 3">Live Share View Operation       
            <div class="toolbar">
            <fluent-text-field id="objNameTextField"  placeholder="model name" ></fluent-text-field>
            </div>  
            <div class="toolbar">
                <fluent-button appearance="accent" id="btnStroke">Stroke</fluent-button>
                <fluent-button appearance="accent" id="btnArrow">Arrow</fluent-button>
                <fluent-button appearance="accent" id="btnLaserPointer">Laser pointer</fluent-button>
                <fluent-button appearance="accent" id="btnHighlighter">Highlighter</fluent-button>
                <fluent-button appearance="accent" id="btnEraser">Eraser</fluent-button>
                <fluent-button appearance="accent" id="btnPointEraser">Point eraser</fluent-button>
                <fluent-button appearance="accent" id="btnClear" >Clear</fluent-button>
                <fluent-button appearance="accent" id="btnToggleCursorShare">Share cursor</fluent-button>
            </div>
            <div class="toolbar">
                <fluent-button appearance="accent" id="btnBlack">Black</fluent-button>
                <fluent-button appearance="accent" id="btnRed">Red</fluent-button>
                <fluent-button appearance="accent" id="btnGreen">Green</fluent-button>
                <fluent-button appearance="accent" id="btnBlue">Blue</fluent-button>
                <fluent-button appearance="accent" id="btnYellow">Yellow</fluent-button>
            </div>
            
            <div class="toolbar">
            <fluent-button appearance="accent" id="btnRotateLeft">Rotate AntiClockwise</fluent-button>            
            <fluent-button appearance="accent" id="btnRotateRight" style="margin-left: 40px;">Rotate Clockwise</fluent-button>
            </div>            
          </fluent-card>
          <fluent-card style="margin-top: 10px;height: 300px;flex: 2">Personal View Operation         
            <div class="toolbar">
                <fluent-button appearance="accent" id="btnZoomOut" style="margin-left: 20px;">Zoom out</fluent-button>
                <fluent-button appearance="accent" id="btnZoomIn" style="margin-left: 20px;">Zoom in</fluent-button>
                <fluent-button appearance="accent" id="btnHideInk" style="margin-left: 20px;">Hide Ink</fluent-button>
                <fluent-button appearance="accent" id="btnDisplayInk" style="margin-left: 20px;">Display Ink</fluent-button>
                <fluent-button appearance="accent" id="btnHide3D" style="margin-left: 20px;">Hide 3D</fluent-button>
                <fluent-button appearance="accent" id="btnDisplay3D" style="margin-left: 20px;">Display 3D</fluent-button>
                <fluent-button appearance="accent" id="btnAnimate3D" style="margin-left: 20px;">Animation</fluent-button>   
                <fluent-button appearance="accent" id="btnResetView" style="margin-left: 20px;">Reset view</fluent-button>             
            </div>
            <div class="toolbar">
                <fluent-button appearance="accent" id="btnOffsetUp" style="margin-left: 20px;">Offset up</fluent-button>                             
                <fluent-button appearance="accent" id="btnOffsetLeft" style="margin-left: 20px;">Offset left</fluent-button>
                <fluent-button appearance="accent" id="btnOffsetRight" style="margin-left: 20px;">Offset right</fluent-button> 
                <fluent-button appearance="accent" id="btnOffsetDown" style="margin-left: 20px;">Offset down</fluent-button>
            </div>               
        </fluent-card>  
        <fluent-card style="margin-top: 10px;height: 300px;flex: 1">  Debug Info
            <div id="debugzone" ></div>
        </fluent-card>  
        </fluent-horizontal-scroll>      
    </div>`;

const objRotateYKey = "RotateY";
const objNameKey = "objName";
const cameraKey = "arcCamera";

export class StageView extends View {
    private _inkingManager!: InkingManager;
    private _container!: IFluidContainer;
    private client!: LiveShareClient;
    private fluidClient!: AzureClient;
    private fluidOption!: string;
    private containerID!: string;
    public static glbObj: AbstractMesh;
    public static originalScale: Vector3 ;
    public static camera: ArcRotateCamera;
    public static freeCamera: FreeCamera;
    public static animationGroupID: number = 0;

    private offsetBy(x: number, y: number) {
        this._inkingManager.offset = {
            x: this._inkingManager.offset.x + x,
            y: this._inkingManager.offset.y + y,
        };

        this.updateBackgroundImagePosition();
    }

    private getLiveCanvas(): LiveCanvas {
        return this._container.initialObjects.liveCanvas as LiveCanvas;
    }

    private _hostResizeObserver!: ResizeObserver;
    private _userInfo!: IUserInfo;

    async createClientandContainer(options: ILiveShareClientOptions | any) {
        this.fluidClient = new AzureClient(options);

        Utils.loadTemplate(
            `<div>Before Join Container</div>`,
            document.body
        );

        if (this.containerID != "empty") {
            this._container = await this.getContainer(this.containerID);
        }
        else {
            const id = await this.createContainer();
            this._container = await this.getContainer(id);
        }
        Utils.loadTemplate(
            `<div>After Join Container</div>`,
            document.body
        );
    }

    async createContainer(): Promise<string> {
        const { container } = await this.fluidClient.createContainer(containerSchema);
        const containerId = await container.attach();
        return containerId;
    };

    async getContainer(id: string): Promise<IFluidContainer> {
        const { container } = await this.fluidClient.getContainer(id, containerSchema);
        return container;
    };



    private async updateCanvas(objRotateY: SharedMap, objName: SharedMap, mainCamera: SharedMap) {

        
        // create the canvas html element and attach it to the webpage
        var canvas = document.getElementById("blcanvas") as HTMLCanvasElement;

        if (canvas) {

            // initialize babylon scene and engine
            var engine = new Engine(canvas, true,{ disableWebGL2Support: true});
            var scene = new Scene(engine);
         
            StageView.camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);            
            StageView.camera.attachControl(canvas, true);

            /*
            var freeCamera = new FreeCamera("freeCamera", new Vector3(0.5, 0, 0.5), scene);
            StageView.freeCamera.attachControl(canvas, true); 
            */


            var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);

            StageView.camera.alpha =  Math.PI/2;
            StageView.camera.beta =  Math.PI/2;
            StageView.camera.radius =  2;

            const env = scene.createDefaultEnvironment();

            if (env?.ground)
            {
                // here we add XR support
                const xr = await scene.createDefaultXRExperienceAsync({
                    floorMeshes: [env.ground],
                });
            }

            /* hide/show the Inspector*/
            window.addEventListener("keydown", (ev) => {
                // Shift+Ctrl+Alt+I
                if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                    if (scene.debugLayer.isVisible()) {
                        scene.debugLayer.hide();
                    } else {
                        scene.debugLayer.show();
                    }
                }
            });
            
           /*
            StageView.camera.onViewMatrixChangedObservable.add(()=>{
                 
                console.log(StageView.camera.alpha + " " + StageView.camera.beta + " " + StageView.camera.radius);
                 
            });
           */

            scene.onPointerMove= (p) =>{
                if (p.buttons === 1)
              {
                const camera = this._container.initialObjects.cameraObj as SharedMap;
                if (camera != null)
                {
                    const arccamera = new arcCamera();
                    arccamera.alpha  = StageView.camera.alpha;
                    arccamera.beta  = StageView.camera.beta;
                    arccamera.radius  = StageView.camera.radius;
                    //const json = JSON.stringify(arccamera);
                    camera.set(cameraKey,arccamera);
                }
              }
            }

            window.addEventListener("resize", () => {
                if (!engine) {
                    return;
                }
    
                engine.resize();
            });

            const importMesh = () => {
                const rotateY = (this._container.initialObjects.objRotateY as SharedMap)?.get(objRotateYKey);
                const objname = (this._container.initialObjects.objName as SharedMap).get(objNameKey) ?? "avatar.glb";
                
                SceneLoader.ImportMesh("", "https://fllivesharecanvas-dev.azurewebsites.net/", objname, scene, function (newMeshes, particleSystems, skeletons, animationGroups) {

                    if (newMeshes) {
                        console.log("load new mesh: "+objname);
                        StageView.glbObj = newMeshes[0];
                        //Scale the model down
                        if (objname.includes('bee'))
                            StageView.glbObj.scaling.scaleInPlace(0.07);
                        else if (objname.includes('avarar'))
                            StageView.glbObj.scaling.scaleInPlace(2);
                        else
                            StageView.glbObj.scaling.scaleInPlace(1);

                        StageView.originalScale = StageView.glbObj.scaling;

                        if (rotateY)
                            StageView.glbObj.rotation = new Vector3(0, rotateY * Math.PI / 180, 0);
                        else
                            StageView.glbObj.rotation = new Vector3(0, Math.PI, 0);
                               
                        
                    }
                });
            };

            const createBox = () => {

                const box = MeshBuilder.CreateBox("box", {size: 0.2});
                    box.position.x = 1;
                    box.position.y = 0.1;
                    box.position.z=0;

                    const boxMaterial = new StandardMaterial("material", scene);
                    boxMaterial.diffuseColor = Color3.Random();
                    box.material = boxMaterial;

                    box.actionManager = new ActionManager(scene);
                    box.actionManager.registerAction(new ExecuteCodeAction(
                        ActionManager.OnPickTrigger, 
                        function (evt) {
                            const sourceBox = evt.meshUnderPointer;
                        if (sourceBox){
                            //move the box upright
                            //sourceBox.position.x += 0.1;
                            //sourceBox.position.y += 0.1;
                        }
                            //update the color
                            boxMaterial.diffuseColor = Color3.Random();
                        }));


            };
                        
            createBox();
            importMesh();

            const updateGlbObjRotation = () => {
                const result = (this._container.initialObjects.objRotateY as SharedMap).get(objRotateYKey);
                if(StageView.glbObj != null && StageView.glbObj.isDisposed() == false)     { 
                StageView.glbObj.rotation = new Vector3(0, result * Math.PI / 180, 0);
                }
            };

            objRotateY?.on("valueChanged", updateGlbObjRotation);

            const updateGlbObj = () => {
                console.log("update glb obj"); 
                
                if(StageView.glbObj != null && StageView.glbObj.isDisposed() == false)     {                          
                scene.removeMesh(StageView.glbObj); 
                StageView.glbObj.dispose();
                }
                importMesh();
            };

            objName?.on("valueChanged", updateGlbObj);

            const updateCamera = () => {
                const camera = this._container.initialObjects.cameraObj as SharedMap;
                const arccamera = camera.get(cameraKey);
               
                StageView.camera.alpha =  arccamera.alpha;
                StageView.camera.beta =  arccamera.beta;
                StageView.camera.radius =  arccamera.radius;
                console.log("update camera");
            };

            mainCamera?.on("valueChanged", updateCamera);

            // run the main render loop
            engine.runRenderLoop(() => {
                scene.render();
            });
        }
    }

    private async internalStart() {

        const host = Utils.runningInTeams()
            ? Teams.LiveShareHost.create()
            : TestLiveShareHost.create();

        const localClientOptions: ILiveShareClientOptions | any =
        {
            connection: {
                type: "local",
                tokenProvider: new InsecureTokenProvider("", {
                    id: "123",
                }),
                endpoint: "http://localhost:7070",
            }

        };

        if (Utils.runningInTeams() == true) {
            Utils.loadTemplate(
                `<div>Before Initialize</div>`,
                document.body
            );

            await Teams.app.initialize();

            Utils.loadTemplate(
                `<div>Initialized</div>`,
                document.body
            );

            Utils.loadTemplate(
                `<div>Before Join Container</div>`,
                document.body
            );


            const fuildOption = this.fluidOption;

            Utils.loadTemplate(
                `<div>Fluid Option is ` + fuildOption + `</div>`,
                document.body
            );

            if (fuildOption == "TeamsDefault") {
                this.client = new LiveShareClient(host);

                this._container = (
                    await this.client.joinContainer(containerSchema)
                ).container;
            }
            else if (fuildOption == "Local") {
                this.client = new LiveShareClient(host,localClientOptions);

                this._container = (
                    await this.client.joinContainer(containerSchema)
                ).container;
            }
            else if (fuildOption == "RemoteInsecure") {
                await this.createClientandContainer(inSecureClientOptions);
            }

            else if (fuildOption == "RemoteSecure") {
                await this.createClientandContainer(remoteClientOptions);
            }

            Utils.loadTemplate(
                `<div>After Join Container</div>`,
                document.body
            );
        }
        else {
            this.client = new LiveShareClient(host,localClientOptions);
            this._container = await (await this.client.joinContainer(containerSchema)).container;

            //await this.createClientandContainer(remoteClientOptions);
        }



        const inkingHost = document.getElementById("inkingHost");

        if (inkingHost) {
            const liveCanvas = this.getLiveCanvas();
            liveCanvas.onGetLocalUserInfo = () => {
                return this._userInfo;
            };

            this._inkingManager = new InkingManager(inkingHost);

            await liveCanvas.initialize(this._inkingManager);

            this._inkingManager.activate();

            this._hostResizeObserver = new ResizeObserver(() => {
                this.updateBackgroundImagePosition();
            });
            this._hostResizeObserver.observe(inkingHost);

            /*
            // Set which roles can draw on the canvas. By default, all roles are allowed
            liveCanvas.allowedRoles = [ UserMeetingRole.presenter ];
            */
        }

        this.updateBackgroundImagePosition();

        this.updateCanvas(this._container.initialObjects.objRotateY as SharedMap, 
                         this._container.initialObjects.objName as SharedMap,
                         this._container.initialObjects.cameraObj as SharedMap);

        
        this._inkingManager.penBrush.color = { r: 255, g: 252, b: 0 };


    }

    private _backgroundImageWidth?: number;
    private _backgroundImageHeight?: number;

    private updateBackgroundImagePosition() {
        const backgroundImage = document.getElementById("backgroundImage") as HTMLImageElement;

        if (
            backgroundImage &&
            this._inkingManager &&
            this._backgroundImageWidth &&
            this._backgroundImageHeight
        ) {
            backgroundImage.style.removeProperty("visibility");

            if (this.fluidOption == "RemoteInsecure")
                backgroundImage.src = "https://bing.com/th?id=OHR.BridgeofSighs_EN-US5335369208_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp";
            if (this.fluidOption == "RemoteSecure")
                backgroundImage.src = "https://bing.com/th?id=OHR.BrockenSpecter_EN-US5247366251_1920x1080.jpg&amp;rf=LaDigue_1920x1080.jpg&amp;pid=hp";

            const actualWidth =
                this._backgroundImageWidth * this._inkingManager.scale;
            const actualHeight =
                this._backgroundImageHeight * this._inkingManager.scale;

            backgroundImage.style.width = actualWidth + "px";
            backgroundImage.style.height = actualHeight + "px";
            backgroundImage.style.left =
                this._inkingManager.centerX +
                this._inkingManager.offset.x -
                (this._backgroundImageWidth / 2) * this._inkingManager.scale +
                "px";
            backgroundImage.style.top =
                this._inkingManager.centerY +
                this._inkingManager.offset.y -
                (this._backgroundImageHeight / 2) * this._inkingManager.scale +
                "px";

        }
    }



    constructor(fluidOption: string, containerID: string) {
        super();

        this.fluidOption = fluidOption;
        this.containerID = containerID;

        getRandomUserInfo().then(
            (u) => this._userInfo = u
        );

        Utils.loadTemplate(appTemplate, document.body);

        const backgroundImage = document.getElementById(
            "backgroundImage"
        ) as HTMLImageElement;

        if (backgroundImage) {
            const showBackgroundImage = () => {
                this._backgroundImageWidth = backgroundImage.naturalWidth;
                this._backgroundImageHeight = backgroundImage.naturalHeight;

                this.updateBackgroundImagePosition();
            };

            if (backgroundImage.complete) {
                showBackgroundImage();
            } else {
                backgroundImage.addEventListener("load", () => {
                    showBackgroundImage();
                });
            }
        }

        const setupButton = (buttonId: string, onClick: () => void) => {
            const button = document.getElementById(buttonId);

            if (button) {
                button.onclick = onClick;
            }
        };

        const setupTextField = (id: string, onChange: (event: any) => void) => {
            const textField = document.getElementById(id);

            if (textField) {
                textField.onchange = onChange;
            }
        };
        

        setupButton("btnStroke", () => {
            this._inkingManager.tool = InkingTool.pen;
        });
        setupButton("btnArrow", () => {
            this._inkingManager.tool = InkingTool.line;
            this._inkingManager.lineBrush.endArrow = "open";
        });
        setupButton("btnLaserPointer", () => {
            this._inkingManager.tool = InkingTool.laserPointer;
        });
        setupButton("btnHighlighter", () => {
            this._inkingManager.tool = InkingTool.highlighter;
        });
        setupButton("btnEraser", () => {
            this._inkingManager.tool = InkingTool.eraser;
        });
        setupButton("btnPointEraser", () => {
            this._inkingManager.tool = InkingTool.pointEraser;
        });

        setupButton("btnBlack", () => {
            this._inkingManager.penBrush.color = { r: 0, g: 0, b: 0 };
        });
        setupButton("btnYellow", () => {
            this._inkingManager.penBrush.color = { r: 255, g: 252, b: 0 };
        });
        setupButton("btnGreen", () => {
            this._inkingManager.penBrush.color = { r: 0, g: 255, b: 0 };
        });
        setupButton("btnRed", () => {
            this._inkingManager.penBrush.color = { r: 255, g: 0, b: 0 };
        });
        setupButton("btnBlue", () => {
            this._inkingManager.penBrush.color = { r: 0, g: 105, b: 175 };
        });

        setupButton("btnClear", () => {
            this._inkingManager.clear();
        });

        setupButton("btnOffsetLeft", () => {
            this.offsetBy(-10, 0);
            StageView.glbObj.position.x += 0.05;
        });
        setupButton("btnOffsetUp", () => {
            this.offsetBy(0, -10);
            StageView.glbObj.position.y += 0.05;
        });
        setupButton("btnOffsetRight", () => {
            this.offsetBy(10, 0);
            StageView.glbObj.position.x -= 0.05;
        });
        setupButton("btnOffsetDown", () => {
            this.offsetBy(0, 10);
            StageView.glbObj.position.y -= 0.05;
        });

        setupButton("btnResetView", () => {
            this._inkingManager.offset = {
                x: 0,
                y: 0,
            };

            this._inkingManager.scale = 1;

            StageView.glbObj.scaling = StageView.originalScale;
            StageView.glbObj.position.x = 0;
            StageView.glbObj.position.y = 0;
            StageView.glbObj.position.z = 0;
            StageView.camera.alpha =  Math.PI/2;
            StageView.camera.beta =  Math.PI/2;
            StageView.camera.radius =  2;

            const element1  = document.getElementById("inkingHost");
            if(element1)
            element1.style.visibility = "visible";

            const element2  = document.getElementById("blcanvas");
            if(element2)
            element2.style.visibility = "visible";

            this.updateBackgroundImagePosition();
        });


        setupButton("btnZoomOut", () => {
            if (this._inkingManager.scale > 0.1) {
                this._inkingManager.scale -= 0.1;
                const scale:Vector3 =  StageView.glbObj.scaling;
            StageView.glbObj.scaling = new Vector3(scale.x*0.9,scale.y*0.9,scale.z*0.9);
                this.updateBackgroundImagePosition();
            }
        });
        setupButton("btnZoomIn", () => {
            this._inkingManager.scale += 0.1;
            const scale:Vector3 =  StageView.glbObj.scaling;
            StageView.glbObj.scaling = new Vector3(scale.x*1.1,scale.y*1.1,scale.z*1.1);
            this.updateBackgroundImagePosition();
        });

        setupButton("btnToggleCursorShare", () => {
            const liveCanvas = this.getLiveCanvas();
            const isCursorShared = liveCanvas.isCursorShared;

            liveCanvas.isCursorShared = !isCursorShared;

            const button = document.getElementById("btnToggleCursorShare");

            if (button) {
                button.innerText = liveCanvas.isCursorShared
                    ? "Stop sharing cursor"
                    : "Share cursor";
            }
        });

        setupButton("btnRotateRight", () => {
            const result = (this._container.initialObjects.objRotateY as SharedMap)?.get(objRotateYKey);

            console.log("right: " + result);
            let rotateY: number = 10;
            if (result)
                rotateY += result;
            (this._container.initialObjects.objRotateY as SharedMap)?.set(objRotateYKey, rotateY);
            StageView.glbObj.rotation = new Vector3(0, rotateY * Math.PI / 180, 0);

            console.log("right: " + rotateY);

        });

        setupButton("btnRotateLeft", () => {
            const result = (this._container.initialObjects.objRotateY as SharedMap)?.get(objRotateYKey);
            let rotateY: number = -10;
            if (result)
                rotateY += result;
            (this._container.initialObjects.objRotateY as SharedMap)?.set(objRotateYKey, rotateY);
            StageView.glbObj.rotation = new Vector3(0, rotateY * Math.PI / 180, 0);
        });

        setupTextField("objNameTextField",(any)=>{
            console.log("new value: " + any.target.value);
            (this._container.initialObjects.objName as SharedMap).set(objNameKey,any.target.value);

            console.log("new share value: " + (this._container.initialObjects.objName as SharedMap).get(objNameKey));
        });

        setupButton("btnHideInk", () => {
            const element  = document.getElementById("inkingHost");
            if(element)
            element.style.visibility = "hidden";
        });

        setupButton("btnDisplayInk", () => {
            const element  = document.getElementById("inkingHost");
            if(element) 
             element.style.visibility = "visible";
        });

        setupButton("btnHide3D", () => {
            const element  = document.getElementById("blcanvas");
            if(element)
            element.style.visibility = "hidden";
        });

        setupButton("btnDisplay3D", () => {
            const element  = document.getElementById("blcanvas");
            if(element)
            element.style.visibility = "visible";
        });

        setupButton("btnAnimate3D", () => {
            const animOrg = StageView.glbObj.getScene().animationGroups[StageView.animationGroupID];
            if(animOrg != null )
                  animOrg.stop();

            StageView.animationGroupID = ++StageView.animationGroupID%3;
            const anim = StageView.glbObj.getScene().animationGroups[StageView.animationGroupID];

            if(anim != null )
                anim.start(true, 1.0, anim.from, anim.to, false);
        });

        

    }


    async start() {
        if (Utils.runningInTeams()) {
            await Teams.app.initialize();

            Teams.app.notifySuccess();
        }

        this.internalStart().catch((error) => {
            console.error(error);

            Utils.loadTemplate(
                `<div>Error: ${JSON.stringify(error)} ${error}</div>`,
                document.body
            );
        });
    }
}
