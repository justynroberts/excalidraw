// Canvas tools, defined once and served two ways: as MCP tools (Claude Desktop,
// Claude Code, any MCP client) and as Claude API tools for the in-app assistant.
// Every tool forwards to the browser tab over the bridge, where the canvas lives.

const color = { type: "string", description: 'CSS hex colour, e.g. "#a5d8ff"' };

const fontFamily = {
  type: "number",
  description:
    "Font: 5 Excalifont (hand-drawn, default), 6 Nunito (clean), 8 Comic Shanns (code), 7 Lilita One (heading), 101 Architects Daughter (architect lettering), 102 Caveat, 103 Kalam, 104 Patrick Hand, 105 Gloria Hallelujah, 106 Shadows Into Light, 107 Gochi Hand.",
};

const label = {
  type: "object",
  description: "Text centred inside the shape (or along the arrow).",
  properties: {
    text: { type: "string" },
    fontSize: { type: "number" },
    fontFamily,
  },
  required: ["text"],
};

const binding = {
  type: "object",
  description: "Bind this arrow end to an existing or newly created shape.",
  properties: { id: { type: "string" } },
  required: ["id"],
};

const skeletonElement = {
  type: "object",
  description:
    "An Excalidraw element skeleton. Shapes: rectangle, ellipse, diamond, stickynote. Also text, arrow, line, frame.",
  properties: {
    type: {
      type: "string",
      enum: [
        "rectangle",
        "ellipse",
        "diamond",
        "stickynote",
        "text",
        "arrow",
        "line",
        "frame",
      ],
    },
    id: {
      type: "string",
      description:
        "Optional stable id so arrows/frames/updates can refer to it.",
    },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
    text: { type: "string", description: "Required for type=text." },
    fontSize: { type: "number" },
    fontFamily,
    label,
    start: binding,
    end: binding,
    points: {
      type: "array",
      description: "Arrow/line points relative to x,y, e.g. [[0,0],[200,0]].",
      items: { type: "array", items: { type: "number" } },
    },
    strokeColor: color,
    backgroundColor: color,
    fillStyle: { type: "string", enum: ["solid", "hachure", "cross-hatch"] },
    strokeWidth: { type: "number" },
    strokeStyle: { type: "string", enum: ["solid", "dashed", "dotted"] },
    roughness: {
      type: "number",
      description: "0 = architect, 1 = artist, 2 = cartoonist",
    },
    roundness: {
      type: "object",
      description: 'Set {"type": 3} for rounded corners.',
      properties: { type: { type: "number" } },
    },
    endArrowhead: {
      type: ["string", "null"],
      enum: ["arrow", "triangle", "dot", "bar", null],
    },
    startArrowhead: {
      type: ["string", "null"],
      enum: ["arrow", "triangle", "dot", "bar", null],
    },
    children: {
      type: "array",
      items: { type: "string" },
      description: "Frame only: ids of elements the frame contains.",
    },
    name: { type: "string", description: "Frame only: title." },
  },
  required: ["type", "x", "y"],
};

export const CANVAS_TOOLS = [
  {
    name: "get_scene",
    description:
      "Read the current whiteboard: every element's id, type, position, size, text/label, colours and arrow bindings, plus the current selection and the bounds of all content. Call this before editing existing content.",
    input_schema: {
      type: "object",
      properties: {
        selectedOnly: {
          type: "boolean",
          description: "Only return the elements the user has selected.",
        },
      },
    },
  },
  {
    name: "add_elements",
    description:
      "Add shapes, text, sticky notes, arrows, lines or frames to the whiteboard. Shapes can carry a centred label. Arrows can bind to shapes by id with start/end. Elements are added in one undoable step. Returns the ids created.",
    input_schema: {
      type: "object",
      properties: {
        elements: { type: "array", items: skeletonElement, minItems: 1 },
        select: {
          type: "boolean",
          description: "Select the new elements afterwards (default true).",
        },
      },
      required: ["elements"],
    },
  },
  {
    name: "update_elements",
    description:
      "Change properties of existing elements by id: move (x, y), resize (width, height), recolour, restyle, or change text. For shapes with a label, pass `text` to change the label.",
    input_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              angle: { type: "number", description: "Radians." },
              text: { type: "string" },
              strokeColor: color,
              backgroundColor: color,
              fillStyle: {
                type: "string",
                enum: ["solid", "hachure", "cross-hatch"],
              },
              strokeWidth: { type: "number" },
              strokeStyle: {
                type: "string",
                enum: ["solid", "dashed", "dotted"],
              },
              roughness: { type: "number" },
              opacity: { type: "number", description: "0-100" },
            },
            required: ["id"],
          },
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "delete_elements",
    description:
      "Delete elements by id. Bound labels and arrow bindings are cleaned up. Undoable by the user.",
    input_schema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" }, minItems: 1 },
      },
      required: ["ids"],
    },
  },
  {
    name: "add_mermaid",
    description:
      "Convert Mermaid source (flowchart, sequenceDiagram, classDiagram, erDiagram, stateDiagram) into native, editable Excalidraw elements and place them on the canvas. Placed to the right of existing content unless x/y are given.",
    input_schema: {
      type: "object",
      properties: {
        definition: { type: "string", description: "Mermaid source." },
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["definition"],
    },
  },
  {
    name: "export_image",
    description:
      "Render the whiteboard (or just some elements) to a PNG so you can see it. Use it to check layout, critique a drawing, or describe what's there.",
    input_schema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "Only render these elements. Omit for the whole canvas.",
        },
      },
    },
  },
  {
    name: "focus_view",
    description:
      "Scroll and zoom the user's view to fit some elements, or all content if ids are omitted.",
    input_schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
    },
  },
  {
    name: "clear_canvas",
    description:
      "Delete every element on the whiteboard. Undoable, but only use it when the user explicitly asks to start over.",
    input_schema: { type: "object", properties: {} },
  },
];

const METHODS = {
  get_scene: "getScene",
  add_elements: "addElements",
  update_elements: "updateElements",
  delete_elements: "deleteElements",
  add_mermaid: "addMermaid",
  export_image: "exportImage",
  focus_view: "focusView",
  clear_canvas: "clearCanvas",
};

/**
 * Run a canvas tool against a browser tab.
 * Returns MCP-shaped content: [{type:"text"}, {type:"image", data, mimeType}].
 */
export const runCanvasTool = async (name, args, callBrowser) => {
  const method = METHODS[name];
  if (!method) {
    throw new Error(`Unknown tool: ${name}`);
  }
  const result = await callBrowser(method, args ?? {});

  if (name === "export_image") {
    return [
      { type: "text", text: `Rendered ${result.width}x${result.height}px.` },
      { type: "image", data: result.data, mimeType: result.mimeType },
    ];
  }
  return [{ type: "text", text: JSON.stringify(result) }];
};

/** MCP content -> Claude API tool_result content. */
export const toClaudeContent = (content) =>
  content.map((block) =>
    block.type === "image"
      ? {
          type: "image",
          source: {
            type: "base64",
            media_type: block.mimeType,
            data: block.data,
          },
        }
      : { type: "text", text: block.text },
  );

/** Minimal structural check of tool input against its schema's required keys. */
export const validateToolInput = (name, input) => {
  const tool = CANVAS_TOOLS.find((t) => t.name === name);
  if (!tool) {
    return `Unknown tool: ${name}`;
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return "Tool input must be a JSON object.";
  }
  for (const key of tool.input_schema.required ?? []) {
    if (!(key in input)) {
      return `Missing required field "${key}".`;
    }
  }
  return null;
};
