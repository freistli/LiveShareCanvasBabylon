/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import * as Utils from "./utils";
import { View } from "./view";
import { app, meeting } from "@microsoft/teams-js";
import { ILiveShareClientOptions, LiveShareClient } from "@microsoft/live-share";
import { AzureFunctionTokenProvider } from "./GetFluidToken";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { AzureClient, AzureClientProps } from "@fluidframework/azure-client";
import { IFluidContainer, SharedMap, SharedString } from "fluid-framework";
import { LiveCanvas } from "@microsoft/live-share-canvas";

export  class arcCamera{
    alpha!: number;
    beta!: number;
    radius!: number;
}

export const containerSchema = {
    initialObjects: {
        liveCanvas: LiveCanvas,
        objRotateY: SharedMap,
        objName: SharedMap,
        cameraObj: SharedMap
    },
};
export const remoteClientOptions: ILiveShareClientOptions | any =
{
    connection: {
        type: "remote",
        tenantId: "",
        tokenProvider: new AzureFunctionTokenProvider("",
            { userId: "123", userName: "Test User", additionalDetails: "xyz" }),
        endpoint: ""
    }
};
export const inSecureClientOptions: ILiveShareClientOptions | any =
{
    connection: {
        tenantId: "",
        tokenProvider: new InsecureTokenProvider(
            "",
            {
                id: "123"
            }
        ),
        endpoint: "",
        type: "remote"
    }
};
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
export class SidebarView extends View {
    public static fluidOption: string | undefined = "TeamsDefault";
    private fluidClient!: AzureClient;
    private containerID: string = "empty";


    async createClientandContainer(options: ILiveShareClientOptions | any) {
        this.fluidClient = new AzureClient(options);

        Utils.loadTemplate(
            `<div>Current Container ID: ` + this.containerID+`</div>`,
            document.body
        );

        if(this.containerID=="empty")        
        {
            this.containerID = await this.createContainer();

            Utils.loadTemplate(
                `<div>Update Container ID</div>`,
                document.body
            );
        }
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

    constructor() {
        super();

        let template = `<div>Live Share Canvas Side Bar
        
        <p/>
        <fluent-select id="fluidOption">
        
        <fluent-option  value="TeamsDefault" selected>Teams Default</fluent-option >        
        <fluent-option  value="RemoteInsecure">Remote Insecure</fluent-option >
        <fluent-option  value="RemoteSecure">Remote Secure</fluent-option >
        </fluent-select>
        
        <p/>
        <text id="userSelected"/>

        </div>`;

        const setupDropdown = (id: string, onChange: (event: any) => void) => {
            const dropdownList = document.getElementById(id);

            if (dropdownList) {
                dropdownList.onchange = onChange;
            }
        };



        if (Utils.runningInTeams()) {
            template += `<fluent-button appearance="accent" id="btnShareToStage">Share to Stage</fluent-button>`;
        }

        Utils.loadTemplate(template, document.body);


        const element = document.getElementById("userSelected");

        if (element)
            element.innerText = "You choosed: " + SidebarView.fluidOption;

        setupDropdown("fluidOption", (any) => {
            SidebarView.fluidOption = any.target.value;
            if (element)
                element.innerText = "You choosed: " + SidebarView.fluidOption;

            if (SidebarView.fluidOption == "RemoteInsecure") {
                this.createClientandContainer(inSecureClientOptions).then
                (
                    () => {
                        if (element)
                            element.innerText = "New Container ID:" + this.containerID;
                    }
                );
            }

            else if (SidebarView.fluidOption == "RemoteSecure") {
                this.createClientandContainer(remoteClientOptions).then
                (
                    () => {
                        if (element)
                            element.innerText =  "New Container ID:" + this.containerID;
                    }
                );
            }            
        });

        const shareToStageButton = document.getElementById("btnShareToStage");

        if (shareToStageButton) {
            shareToStageButton.onclick = () => {
                meeting.shareAppContentToStage((error, result) => {
                    if (!error) {
                        console.log("Started sharing to stage");
                    } else {
                        console.warn("shareAppContentToStage failed", error);
                    }
                }, window.location.origin + "?inTeams=1&view=stage&fluidOption=" + SidebarView.fluidOption
                + "&containerID="
                + this.containerID);
            };
        }
    }

    async start() {
      await  app.initialize();
        app.notifySuccess();
    }
}
