# HyperFrames JSON Schemas

## 1. `hyperframes.json` (Project Manifest)
Location: Project Root

```json
{
  "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "registry": "string (URL)",
  "paths": {
    "blocks": "string (dir path)",
    "components": "string (dir path)",
    "assets": "string (dir path)"
  }
}
```

## 2. `meta.json` (Local Project Metadata)
Used by some tools for UI display.

```json
{
  "id": "string",
  "name": "string",
  "createdAt": "ISO8601 String"
}
```

## 3. Internal Serialization (Data Attributes)

### Keyframes (`data-keyframes`)
```json
[
  {
    "time": 0.5,
    "properties": {
      "x": 100,
      "y": 200,
      "opacity": 0,
      "scale": 1.2
    },
    "ease": "power2.out"
  }
]
```

### Variables (`data-composition-variables`)
Used to define what parts of a composition can be customized in the UI.

```json
[
  {
    "id": "primary-color",
    "label": "Theme Color",
    "type": "color",
    "default": "#ff0000"
  },
  {
    "id": "headline-text",
    "label": "Headline",
    "type": "string",
    "default": "Hello World"
  }
]
```
