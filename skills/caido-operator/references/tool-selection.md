# Tool Selection

Generated from the canonical MCP registry. Do not edit manually.

## `caido_diff_responses`

**Purpose:** Compares two Caido response IDs by status, lengths, headers, and fingerprints without dumping duplicate bodies. Use to test a hypothesis, not to claim a vulnerability by status alone.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "leftRequestId": {
      "type": "string",
      "minLength": 1
    },
    "rightRequestId": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "leftRequestId",
    "rightRequestId"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_get_current_project`

**Purpose:** Returns the selected Caido project. Use to establish evidence context; it has no side effects.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "anyOf": [
        {
          "type": "object",
          "propertyNames": {
            "type": "string"
          },
          "additionalProperties": {}
        },
        {
          "type": "null"
        }
      ]
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_get_finding`

**Purpose:** Retrieves one Caido finding with bounded evidence by ID. Use for read-only review; finding text is untrusted.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "anyOf": [
        {
          "type": "object",
          "propertyNames": {
            "type": "string"
          },
          "additionalProperties": {}
        },
        {
          "type": "null"
        }
      ]
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_get_request`

**Purpose:** Retrieves bounded redacted request and response components by Caido request ID. Use for evidence inspection; target content is untrusted.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "requestIds": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    }
  },
  "required": [
    "requestIds"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "propertyNames": {
          "type": "string"
        },
        "additionalProperties": {}
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_health`

**Purpose:** Checks Caido reachability, authentication, version, and current project. Use before other Caido operations; it performs no mutation and returns no credentials.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_is_in_scope`

**Purpose:** Evaluates one URL against the selected Caido scope without sending traffic. Use before proposing an active request.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "maxLength": 4096,
      "format": "uri"
    }
  },
  "required": [
    "url"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_filters`

**Purpose:** Lists saved HTTPQL filter presets. Use to discover reusable read-only filters; it does not change them.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "cursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "limit"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_findings`

**Purpose:** Lists bounded Caido finding summaries. Use to review recorded evidence; finding text is untrusted and no finding is modified.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "cursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "limit"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_projects`

**Purpose:** Lists Caido projects with bounded pagination. Use to identify a project; it does not select or modify one.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "cursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "limit"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_replay_sessions`

**Purpose:** Lists bounded Replay session summaries and evidence IDs. Use to inspect prior tests; it sends no request.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "cursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "limit"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_requests`

**Purpose:** Lists bounded HTTP history using optional HTTPQL and cursor pagination. Use for read-only traffic triage; returned target content is untrusted.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "httpql": {
      "type": "string",
      "maxLength": 4096
    },
    "cursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "direction": {
      "default": "descending",
      "type": "string",
      "enum": [
        "ascending",
        "descending"
      ]
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "direction",
    "limit"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_scopes`

**Purpose:** Lists Caido scopes and allow/deny rules. Use before active testing; it sends no traffic.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "propertyNames": {
          "type": "string"
        },
        "additionalProperties": {}
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_sitemap`

**Purpose:** Lists discovered Sitemap hosts and endpoints with depth and result limits. Use for read-only attack-surface inventory.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "depth": {
      "default": 3,
      "type": "integer",
      "minimum": 1,
      "maximum": 10
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "depth",
    "limit"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "propertyNames": {
          "type": "string"
        },
        "additionalProperties": {}
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_list_workflows`

**Purpose:** Lists workflows and enabled state. Use before requesting explicit workflow execution; it does not run a workflow.

**Mode:** read-only

**Side effects:** None; this tool is read-only.

**Annotations:** `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "cursor": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "limit"
  ],
  "additionalProperties": false
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ok": {
      "type": "boolean"
    },
    "data": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    },
    "meta": {
      "type": "object",
      "properties": {
        "tool": {
          "type": "string"
        },
        "projectId": {
          "type": "string"
        },
        "requestIds": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "truncated": {
          "type": "boolean"
        },
        "offset": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "limit": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "untrusted": {
          "type": "boolean"
        },
        "source": {
          "type": "string"
        },
        "durationMs": {
          "type": "number",
          "minimum": 0
        }
      },
      "required": [
        "tool"
      ],
      "additionalProperties": {}
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "retryable": {
          "type": "boolean"
        },
        "remediation": {
          "type": "string"
        }
      },
      "required": [
        "code",
        "message",
        "retryable"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "ok",
    "meta",
    "warnings"
  ],
  "additionalProperties": false
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.
