#!/usr/bin/env python3
import json
from pathlib import Path

import cv2


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "wheather.png"
OUTPUT_DIR = ROOT / "apps" / "web-new" / "images" / "weather"
DEBUG_PATH = OUTPUT_DIR / "debug_overlay.png"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"

CARD_NAMES = [
    "sunny",
    "clear-night",
    "rainy",
    "stormy",
    "snowy",
    "cloudy",
    "cloudy-soft",
    "foggy",
    "sandstorm",
    "hail",
    "windy",
]


def detect_boxes(image):
    if image.shape[2] < 4:
        raise SystemExit("Expected wheather.png to contain alpha channel")

    alpha = image[:, :, 3]
    mask = (alpha > 0).astype("uint8")
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    boxes = []
    for label in range(1, num_labels):
        x, y, w, h, area = stats[label]
        if area < 1000:
            continue
        boxes.append({
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "center_x": int(x + w / 2),
            "center_y": int(y + h / 2),
        })

    boxes.sort(key=lambda box: (box["y"], box["x"]))
    if len(boxes) != 11:
        raise SystemExit(f"Expected 11 cards from alpha connected components, got {len(boxes)}")

    for name, box in zip(CARD_NAMES, boxes):
        box["name"] = name
    return boxes


def save_outputs(image, boxes):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for box in boxes:
        x, y, w, h = box["x"], box["y"], box["width"], box["height"]
        crop = image[y:y + h, x:x + w]
        cv2.imwrite(str(OUTPUT_DIR / f'{box["name"]}.png'), crop)

    overlay = image.copy()
    for index, box in enumerate(boxes, start=1):
        x, y, w, h = box["x"], box["y"], box["width"], box["height"]
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 255, 0), 8)
        cv2.circle(overlay, (box["center_x"], box["center_y"]), 18, (0, 0, 255), -1)
        cv2.putText(overlay, str(index), (x + 20, y + 64), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 0, 0), 4)
    cv2.imwrite(str(DEBUG_PATH), overlay)

    MANIFEST_PATH.write_text(json.dumps({
        "source": str(SOURCE),
        "cards": boxes,
    }, indent=2), encoding="utf-8")


def main():
    image = cv2.imread(str(SOURCE), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise SystemExit(f"Unable to read source image: {SOURCE}")
    boxes = detect_boxes(image)
    save_outputs(image, boxes)
    print(MANIFEST_PATH)
    print(DEBUG_PATH)


if __name__ == "__main__":
    main()
