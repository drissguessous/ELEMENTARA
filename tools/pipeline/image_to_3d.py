"""Convert hero concept images into 3D models (GLB) with TRELLIS (open-source, Microsoft, MIT licence)
running on a free Hugging Face Space. Runs in GitHub Actions (see .github/workflows/generate-3d.yml).

The input images are the untouched hero artworks with only the background removed
(public/assets/heroes/*.png). Results land in models/raw/<hero>.glb with a preview video,
and must be validated by the art director before rigging (docs/ASSET_PIPELINE.md).
"""
import json
import os
import shutil
import sys
import traceback

from gradio_client import Client, handle_file

REPO_RAW = os.environ.get(
    "REPO_RAW", "https://raw.githubusercontent.com/drissguessous/elementara/main/public/assets/heroes"
)
SPACES = [s for s in os.environ.get("TRELLIS_SPACES", "trellis-community/TRELLIS,microsoft/TRELLIS").split(",") if s]
HEROES = [h for h in os.environ.get("HEROES", "fire,water,wind,earth,light").split(",") if h]
OUT = "models/raw"
os.makedirs(OUT, exist_ok=True)
token = os.environ.get("HF_TOKEN") or None
report = {}


def convert(client: Client, hero: str):
    url = f"{REPO_RAW}/{hero}.png"
    try:
        client.predict(api_name="/start_session")
    except Exception:
        pass
    img = client.predict(image=handle_file(url), api_name="/preprocess_image")
    res = client.predict(
        image=handle_file(img) if isinstance(img, str) else img,
        multiimages=[],
        seed=int(os.environ.get("SEED", "1")),
        ss_guidance_strength=7.5,
        ss_sampling_steps=12,
        slat_guidance_strength=3,
        slat_sampling_steps=12,
        multiimage_algo="stochastic",
        mesh_simplify=0.9,
        texture_size=2048,
        api_name="/generate_and_extract_glb",
    )
    print(hero, "->", res)
    paths = [p for p in (res if isinstance(res, (list, tuple)) else [res]) if isinstance(p, str)]
    glb = next((p for p in paths if p.endswith(".glb")), None)
    video = next((p for p in paths if p.endswith(".mp4")), None)
    if not glb:
        raise RuntimeError(f"no GLB in result: {res}")
    shutil.copy(glb, f"{OUT}/{hero}.glb")
    if video:
        shutil.copy(video, f"{OUT}/{hero}-preview.mp4")


for space in SPACES:
    todo = [h for h in HEROES if not os.path.exists(f"{OUT}/{h}.glb")]
    if not todo:
        break
    try:
        try:
            client = Client(space, token=token)
        except TypeError:
            client = Client(space, hf_token=token)
        print(client.view_api(return_format="str", print_info=False))
    except Exception as e:
        report[space] = f"connect failed: {e}"
        continue
    for hero in todo:
        try:
            convert(client, hero)
            report[f"{space}:{hero}"] = "ok"
        except Exception as e:
            traceback.print_exc()
            report[f"{space}:{hero}"] = f"failed: {e}"[:500]

with open(f"{OUT}/report.json", "w") as f:
    json.dump(report, f, indent=2)
print(json.dumps(report, indent=2))
sys.exit(0)
