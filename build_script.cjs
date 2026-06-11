
const builder = require("electron-builder");
const Platform = builder.Platform;

builder.build({
    targets: Platform.WINDOWS.createTarget(),
    config: {
        appId: "com.storeflow.erp",
        productName: "StoreFlow ERP",
        directories: {
            output: "release"
        },
        files: [
            "dist/**/*",
            "electron/**/*",
            "package.json"
        ],
        win: {
            target: "portable",
            artifactName: "${productName} ${version}.${ext}"
        },
        nsis: {
            oneClick: false,
            allowToChangeInstallationDirectory: true
        },
        // Avoid code signing errors
        forceCodeSigning: false
    }
})
    .then(() => {
        console.log("Build successful");
    })
    .catch((error) => {
        console.error("Build failed!");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
        process.exit(1);
    });
