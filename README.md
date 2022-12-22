# Live Canvas POC

Starting from [the simple live canvas demo](https://github.com/microsoft/live-share-sdk/tree/main/samples/javascript/03.live-canvas-demo), this repository is customized as an advanced POC of using `LiveCanvas`, `Fluid UI/Web Component`, `BabyLon Js` and `InkingManager` to implement a collaborative inking 2D/3D objects (3D rendering works in Teams Web App with WebGL2, in Teams Desktop App with WebGL) teams meeting extension. It also supports switching different backend Fluid Relay Services. 



https://user-images.githubusercontent.com/8623897/208295231-b3382580-d61e-4986-a56c-e9538c8ea7e1.mp4



![image](https://user-images.githubusercontent.com/8623897/204969724-ad141d92-01d3-4b1f-bdb3-a84251731a40.png)



## Features

1.	Add features to support multiple Azure Fluid Relay Service switching
2.	Integrated Fluid UI 
3.	Integrated Babylon 3D library
4.	Support to pick up different layers (2D, 3D, Inking)
5.	Different view operations (Live Share View, Personal View)
6.	3D models specifically live share operations (switch different models, camera moving, object moving, rotating, scaling)

## Testing Locally in Browser

In the project directory, you can run:

### `npm install`

Installs the latest node packages

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:8080](http://localhost:8080) to view it in your browser.

NOTE: You may need to set PORT environment before run `npm run start`

`$env:PORT=7070`

The page will reload when you make changes.\
Upon loading, if there is no `/#{id}` in the URL, it will create one and insert it into the URL.\
You can copy this URL and paste it into new browser tabs to test Live Share using a local server.\

### `npm run build`

Builds the app for production to the `build` folder.\

The build is minified and the filenames include the hashes.\

In this projec,the output folder is .\dist

Add one web.config as below:

```
<configuration>

   <system.webServer>
   
      <staticContent>
      
         <remove fileExtension=".json"/>
         
         <remove fileExtension=".txt"/>
         
         <mimeMap fileExtension=".json" mimeType="application/json" />
         
         <mimeMap fileExtension=".txt" mimeType="application/txt" />
         
         <mimeMap fileExtension=".glb" mimeType="application/stream" />
         
      </staticContent>
      
   </system.webServer>
   
</configuration>
```

Your app is ready to be deployed to Azure App Service!

### Prepare 3D models

The POC has good performance when loading 3D models below 30MB. You can put *.glb directly in the Azure App Service web site folder you deployed in the above step.For example, I put avatar.glb and bee01.glb here: 

![image](https://user-images.githubusercontent.com/8623897/205583025-be65934d-d52e-4844-85d7-f8661a966cca.png)



### Setup customized Fluid Relay Service （Optional)

1.  Create your own Fluid Relay Service on Azure, note its tenant id and key
2.  Create your Azure Function to provide token generation, check this [guideline](https://learn.microsoft.com/en-us/azure/azure-fluid-relay/how-tos/azure-function-token-provider#create-an-endpoint-for-your-tokenprovider-using-azure-functions)
3.  Add necessary information the [Remote Secure option](https://github.com/freistli/live-share-sdk/blob/main/samples/03.live-canvas-demo/src/sidebar-view.ts#L21) and [Remote InSecure option](https://github.com/freistli/live-share-sdk/blob/main/samples/03.live-canvas-demo/src/sidebar-view.ts#L31) in code

Refer to:

<img src="https://user-images.githubusercontent.com/8623897/205571514-062fa82d-eb32-4055-9c87-a4a7b7cb261b.png" width="280"></img>

## Testing the app in Teams

### Create a ngrok tunnel to allow Teams to reach your tab app

1. [Download ngrok](https://ngrok.com/download).
2. Launch ngrok with port 8080.
   `ngrok http 8080 --host-header=localhost`

### Create the app package to sideload into Teams

1. Open `.\manifest\manifest.json` and update values in it, including your [Application ID](https://learn.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema#id.
2. You must replace `https://<<BASE_URI_DOMAIN>>` with the https path to your ngrok tunnel.
3. It is recommended that you also update the following fields.
    - Set `developer.name` to your name.
    - Update `developer.websiteUrl` with your website.
    - Update `developer.privacyUrl` with your privacy policy.
    - Update `developer.termsOfUseUrl` with your terms of use.
4. Create a zip file with the contents of `.\manifest` directory so that manifest.json, color.png, and outline.png are in the root directory of the zip file.
    - On Windows, select all files in `.\manifest` directory and compress them to zip.
    - Give your zip file a descriptive name, e.g. `ContosoLiveCanvas`.

### Test it out

1. Schedule a meeting for testing from calendar in Teams.
2. Join the meeting.
3. In the meeting window, tap on **+ Apps** and tap on **Manage apps** in the flyout that opens.
4. In the **Manage apps** pane, tap on **Upload a custom app**.
    - _Don't see the option to **Upload a custom app?!** Follow [instructions here](https://docs.microsoft.com/en-us/microsoftteams/teams-custom-app-policies-and-settings) to enable custom-apps in your tenant._
5. Select the zip file you created earlier and upload it.
6. In the dialog that shows up, tap **Add** to add your sample app into the meeting.
7. Now, back in the meeting window, tap **+ Apps** again and type the name of your app in the _Find an app_ textbox.
8. Select the app to activate it in the meeting.
9. In the configuration dialog, just tap **Save** to add your app into the meeting.
10. In the side panel, tap the share icon to put your app on the main stage in the meeting.
11. That's it! You should now see react-media-template on the meeting stage.
12. Your friends/colleagues invited to the meeting should be able to see your app on stage when they join the meeting.
13. If you configured your own Fluid Relay Service, can choose different Fluid Service Intances in the right pane:

![image](https://user-images.githubusercontent.com/8623897/205577177-a0757ea1-fa34-4d77-8e4b-23a7c784cb0e.png)

NOTE: If you test "Remote Secure" or "Remote InSecure", make sure click the "Share to Stage" after seeing the new Container ID occurs:

<img src="https://user-images.githubusercontent.com/8623897/205578282-81904493-c296-41f5-b0c1-7bbd9cdffec7.png" width="200"/>

14. To load your 3D model (you should test this in Teams Web App), type the model name directly in the "Live Share View Operation"

![image](https://user-images.githubusercontent.com/8623897/205583719-7dd68a0b-c700-48ea-8a04-f691a31ba25a.png)



### Make your own manifest

To make a new app manifest, you can visit the [Teams Developer Portal](https://dev.teams.microsoft.com/).
