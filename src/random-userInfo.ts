/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */
 import * as Teams from "@microsoft/teams-js";
import { IUserInfo } from "@microsoft/live-share-canvas";
import * as Utils from "./utils";
const firstNames = [
    "Dog",
    "Cat",
    "Clippy",
    "Micro",
    "Snake",
    "Dr",
    "Dino",
    "Gamer",
    "Rock",
    "Paper",
    "Scissors",
];

const lastNames = [
    "Dev",
    "Official",
    "Main",
    "Purse",
    "Star",
    "Martian",
    "Gaze",
    "Lock",
    "World",
    "Smile",
    "Stylist",
];

function getRandomValue(list: string[]): string {
    return list[Math.floor(Math.random() * list.length)];
}

export async function getRandomUserInfo(): Promise<IUserInfo> {
    if (Utils.runningInTeams())
    {
        await Teams.app.initialize();
        return {
            displayName:  (await Teams.app.getContext()).user?.userPrincipalName
        };
    }
    else
    {
    const firstName = getRandomValue(firstNames);
    const lastName = getRandomValue(lastNames);
   
    return {
        displayName: `${firstName} ${lastName}`,
    };
   }
}
