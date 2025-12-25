from fastapi import FastAPI, File, UploadFile, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import torch
from torchvision import transforms
from PIL import Image
import numpy as np
import io, os, json, traceback
from timm import create_model

# ---------------------- #
#        CONFIG
# ---------------------- #

MODEL_PATH = "swinv2_small_window16_256_epoch_20.pt"
LABELS_PATH = "labels.json"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
APP_HOST = "127.0.0.1"
APP_PORT = 7000
# ---------------------- #
#      FASTAPI APP
# ---------------------- #
app = FastAPI(title="SwinV2 Inference API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

print(f"[INFO] Loading PyTorch model from {MODEL_PATH} ...")
try:
    state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
    model = create_model("swinv2_small_window16_256", pretrained=False, num_classes=5)
    model.load_state_dict(state_dict, strict=False)
    model.to(DEVICE)
    model.eval()
    print("[INFO] Model loaded successfully.")
except Exception as e:
    print(f"[ERROR] Could not load model: {e}")
    traceback.print_exc()
    model = None



labels = None
if os.path.exists(LABELS_PATH):
    try:
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            labels = json.load(f)
        print(f"[INFO] Loaded {len(labels)} labels.")
    except Exception as e:
        print(f"[WARN] Failed to load labels: {e}")
transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])



def preprocess_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(image).unsqueeze(0)
    return tensor.to(DEVICE)

# ---------------------- #
#         ROUTES
# ---------------------- #
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        return JSONResponse({"error": "Model not loaded."}, status_code=500)

    try:
        contents = await file.read()
        tensor = preprocess_image(contents)

        with torch.no_grad():
            outputs = model(tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1).cpu().numpy()[0]

        top_k = 5
        top_indices = np.argsort(probs)[-top_k:][::-1]
        predictions = [
            {"label": labels[i] if labels and i < len(labels) else str(i),
             "probability": float(probs[i])}
            for i in top_indices
        ]

        return JSONResponse({"top": predictions, "raw": probs.tolist()})

    except Exception as e:
        tb = traceback.format_exc()
        return JSONResponse({
            "error": "Prediction failed",
            "details": str(e),
            "traceback": tb
        }, status_code=500)
if __name__ == "__app__":
    # Когда запускаешь как "python filename.py" — uvicorn запустит приложение
    uvicorn.run(
        "app:app",   # <- заменяй your_module_name на имя файла без .py, например "main:app"
        host=APP_HOST,
        port=APP_PORT,
        reload=True,              # dev only: автоматически перезапускает сервер при изменениях
        workers=1,                # можно увеличить для production, но с CUDA лучше 1 процесс
        log_level="info",
    )
