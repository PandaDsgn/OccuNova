# backend/main.py
import base64
import io

import cv2
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# Load all 3 models at startup
unet_model = tf.keras.models.load_model("models/optic_disc_unet.keras")
triage_model = tf.keras.models.load_model("models/triage_model.keras")
spec_model = tf.keras.models.load_model("models/specialist_model.keras")


@app.post("/autocrop")
async def autocrop(file: UploadFile = File(...)):
    # 1. Read original image
    file_bytes = await file.read()
    original_image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    orig_w, orig_h = original_image.size

    # 2. Prepare for U-Net (Assuming 256x256 input for your U-Net)
    unet_input = original_image.resize((256, 256))
    unet_array = np.expand_dims(np.array(unet_input) / 255.0, axis=0)

    # 3. Predict Mask
    mask = unet_model.predict(unet_array)[0]
    mask = (mask > 0.5).astype(np.uint8)

    # 4. Find the center of mass of the optic disc mask using OpenCV
    moments = cv2.moments(mask)
    if moments["m00"] != 0:
        cx = int(moments["m10"] / moments["m00"])
        cy = int(moments["m01"] / moments["m00"])
    else:
        cx, cy = 128, 128  # Fallback to center if mask fails

    # 5. Map the center back to original image dimensions
    scale_x = orig_w / 256.0
    scale_y = orig_h / 256.0
    true_cx = int(cx * scale_x)
    true_cy = int(cy * scale_y)

    # 6. Crop a 224x224 bounding box
    left, top = max(0, true_cx - 112), max(0, true_cy - 112)
    right, bottom = min(orig_w, true_cx + 112), min(orig_h, true_cy + 112)
    cropped_img = original_image.crop((left, top, right, bottom))

    # Pad with black if the crop hit the edge of the image
    final_crop = Image.new("RGB", (224, 224), (0, 0, 0))
    final_crop.paste(cropped_img, (0, 0))

    # 7. Convert to base64 so React can display it instantly
    buffered = io.BytesIO()
    final_crop.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

    return {"auto_crop_b64": f"data:image/jpeg;base64,{img_str}"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # This remains the same as before
    image = Image.open(io.BytesIO(await file.read())).convert("RGB").resize((224, 224))
    img_array = np.expand_dims(np.array(image), axis=0)

    triage_pred = triage_model.predict(img_array)[0][0]
    if triage_pred < 0.15:
        return {"diagnosis": "negative", "triage_score": float(triage_pred)}

    spec_pred = spec_model.predict(img_array)[0][0]
    diagnosis = "positive" if spec_pred > 0.5 else "negative"

    return {
        "diagnosis": diagnosis,
        "triage_score": float(triage_pred),
        "spec_score": float(spec_pred),
    }
