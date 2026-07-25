# Tool Selection

Generated from the canonical MCP registry. Do not edit manually.

## `caido_create_finding`

**Purpose:** Creates exactly one Caido finding from a bounded title, description, and request evidence ID. It never retries automatically.

**Mode:** active

**Side effects:** Performs the single bounded mutation described above; active mode is required.

**Annotations:** `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "description": {
      "type": "string",
      "maxLength": 4096
    },
    "requestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    }
  },
  "required": [
    "title",
    "description",
    "requestId"
  ],
  "additionalProperties": false
}
```

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "summary": {
              "type": "string",
              "const": "Created one Caido finding."
            },
            "evidence": {
              "type": "object",
              "properties": {
                "projectId": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "mutation": {
                  "type": "string",
                  "const": "create_finding"
                }
              },
              "required": [
                "requestIds",
                "mutation"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "summary",
            "evidence"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_create_finding"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_create_finding"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Active network operations require an allowed selected scope; management mutations remain bounded and explicit.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "left": {
              "anyOf": [
                {
                  "type": "object",
                  "properties": {
                    "requestId": {
                      "type": "string"
                    },
                    "statusCode": {
                      "type": "integer",
                      "minimum": 100,
                      "maximum": 999
                    },
                    "byteLength": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "headers": {
                      "type": "array",
                      "items": {
                        "type": "array",
                        "prefixItems": [
                          {
                            "type": "string"
                          },
                          {
                            "type": "string"
                          }
                        ]
                      }
                    },
                    "fingerprint": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{64}$"
                    }
                  },
                  "required": [
                    "requestId",
                    "byteLength",
                    "headers",
                    "fingerprint"
                  ],
                  "additionalProperties": false
                },
                {
                  "type": "null"
                }
              ]
            },
            "right": {
              "anyOf": [
                {
                  "type": "object",
                  "properties": {
                    "requestId": {
                      "type": "string"
                    },
                    "statusCode": {
                      "type": "integer",
                      "minimum": 100,
                      "maximum": 999
                    },
                    "byteLength": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "headers": {
                      "type": "array",
                      "items": {
                        "type": "array",
                        "prefixItems": [
                          {
                            "type": "string"
                          },
                          {
                            "type": "string"
                          }
                        ]
                      }
                    },
                    "fingerprint": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{64}$"
                    }
                  },
                  "required": [
                    "requestId",
                    "byteLength",
                    "headers",
                    "fingerprint"
                  ],
                  "additionalProperties": false
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "left",
            "right"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_diff_responses"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_diff_responses"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "anyOf": [
            {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "selected": {
                  "type": "boolean"
                }
              },
              "required": [
                "id",
                "name",
                "selected"
              ],
              "additionalProperties": false
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
              "type": "string",
              "const": "caido_get_current_project"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_get_current_project"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "anyOf": [
            {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "title": {
                  "type": "string"
                },
                "severity": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "description": {
                  "type": "string"
                },
                "evidence": {
                  "type": "object",
                  "properties": {
                    "contentType": {
                      "type": "string"
                    },
                    "byteLength": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
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
                    "truncated": {
                      "type": "boolean"
                    },
                    "sha256": {
                      "type": "string",
                      "pattern": "^[a-f0-9]{64}$"
                    },
                    "text": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "contentType",
                    "byteLength",
                    "offset",
                    "limit",
                    "truncated",
                    "sha256"
                  ],
                  "additionalProperties": false
                }
              },
              "required": [
                "id",
                "title",
                "severity",
                "requestIds",
                "description",
                "evidence"
              ],
              "additionalProperties": false
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
              "type": "string",
              "const": "caido_get_finding"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_get_finding"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "method": {
                "type": "string"
              },
              "host": {
                "type": "string"
              },
              "path": {
                "type": "string"
              },
              "scheme": {
                "type": "string",
                "enum": [
                  "http",
                  "https"
                ]
              },
              "port": {
                "type": "integer",
                "minimum": 1,
                "maximum": 65535
              },
              "statusCode": {
                "type": "integer",
                "minimum": 100,
                "maximum": 999
              },
              "requestLength": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "responseLength": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "createdAt": {
                "type": "string"
              },
              "request": {
                "type": "object",
                "properties": {
                  "headers": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "prefixItems": [
                        {
                          "type": "string"
                        },
                        {
                          "type": "string"
                        }
                      ]
                    }
                  },
                  "contentType": {
                    "type": "string"
                  },
                  "body": {
                    "type": "object",
                    "properties": {
                      "contentType": {
                        "type": "string"
                      },
                      "byteLength": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
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
                      "truncated": {
                        "type": "boolean"
                      },
                      "sha256": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "text": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "contentType",
                      "byteLength",
                      "offset",
                      "limit",
                      "truncated",
                      "sha256"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "headers",
                  "contentType",
                  "body"
                ],
                "additionalProperties": false
              },
              "response": {
                "type": "object",
                "properties": {
                  "headers": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "prefixItems": [
                        {
                          "type": "string"
                        },
                        {
                          "type": "string"
                        }
                      ]
                    }
                  },
                  "contentType": {
                    "type": "string"
                  },
                  "body": {
                    "type": "object",
                    "properties": {
                      "contentType": {
                        "type": "string"
                      },
                      "byteLength": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
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
                      "truncated": {
                        "type": "boolean"
                      },
                      "sha256": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "text": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "contentType",
                      "byteLength",
                      "offset",
                      "limit",
                      "truncated",
                      "sha256"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "headers",
                  "contentType",
                  "body"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "id",
              "method",
              "host",
              "path",
              "scheme",
              "port",
              "createdAt",
              "request"
            ],
            "additionalProperties": false
          }
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_get_request"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_get_request"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "reachable": {
              "type": "boolean"
            },
            "authenticated": {
              "type": "boolean"
            },
            "version": {
              "type": "string"
            },
            "currentProject": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "selected": {
                  "type": "boolean"
                }
              },
              "required": [
                "id",
                "name",
                "selected"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "reachable",
            "authenticated"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_health"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_health"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "allowed": {
              "type": "boolean"
            },
            "reason": {
              "type": "string",
              "enum": [
                "matched_allow",
                "matched_deny",
                "no_matching_allow",
                "no_selected_scope"
              ]
            },
            "matchedRule": {
              "type": "object",
              "properties": {
                "action": {
                  "type": "string",
                  "enum": [
                    "allow",
                    "deny"
                  ]
                },
                "host": {
                  "type": "string"
                },
                "scheme": {
                  "type": "string",
                  "enum": [
                    "http",
                    "https"
                  ]
                },
                "port": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 65535
                }
              },
              "required": [
                "action",
                "host"
              ],
              "additionalProperties": false
            },
            "scopeId": {
              "type": "string"
            }
          },
          "required": [
            "allowed",
            "reason"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_is_in_scope"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_is_in_scope"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  },
                  "query": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "query"
                ],
                "additionalProperties": false
              }
            },
            "nextCursor": {
              "type": "string"
            }
          },
          "required": [
            "items"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_filters"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_filters"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "title": {
                    "type": "string"
                  },
                  "severity": {
                    "type": "string"
                  },
                  "requestIds": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "id",
                  "title",
                  "severity",
                  "requestIds"
                ],
                "additionalProperties": false
              }
            },
            "nextCursor": {
              "type": "string"
            }
          },
          "required": [
            "items"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_findings"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_findings"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  },
                  "selected": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "selected"
                ],
                "additionalProperties": false
              }
            },
            "nextCursor": {
              "type": "string"
            }
          },
          "required": [
            "items"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_projects"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_projects"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  },
                  "entryIds": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "id",
                  "name",
                  "entryIds"
                ],
                "additionalProperties": false
              }
            },
            "nextCursor": {
              "type": "string"
            }
          },
          "required": [
            "items"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_replay_sessions"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_replay_sessions"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "method": {
                    "type": "string"
                  },
                  "host": {
                    "type": "string"
                  },
                  "path": {
                    "type": "string"
                  },
                  "scheme": {
                    "type": "string",
                    "enum": [
                      "http",
                      "https"
                    ]
                  },
                  "port": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 65535
                  },
                  "statusCode": {
                    "type": "integer",
                    "minimum": 100,
                    "maximum": 999
                  },
                  "requestLength": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "responseLength": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  },
                  "createdAt": {
                    "type": "string"
                  }
                },
                "required": [
                  "id",
                  "method",
                  "host",
                  "path",
                  "scheme",
                  "port",
                  "createdAt"
                ],
                "additionalProperties": false
              }
            },
            "nextCursor": {
              "type": "string"
            }
          },
          "required": [
            "items"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_requests"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_requests"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "rules": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "action": {
                      "type": "string",
                      "enum": [
                        "allow",
                        "deny"
                      ]
                    },
                    "host": {
                      "type": "string"
                    },
                    "scheme": {
                      "type": "string",
                      "enum": [
                        "http",
                        "https"
                      ]
                    },
                    "port": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 65535
                    }
                  },
                  "required": [
                    "action",
                    "host"
                  ],
                  "additionalProperties": false
                }
              },
              "selected": {
                "type": "boolean"
              }
            },
            "required": [
              "id",
              "name",
              "rules",
              "selected"
            ],
            "additionalProperties": false
          }
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_scopes"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_scopes"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "__schema0": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string"
        },
        "label": {
          "type": "string"
        },
        "kind": {
          "type": "string",
          "enum": [
            "host",
            "path"
          ]
        },
        "children": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/__schema0"
          }
        }
      },
      "required": [
        "id",
        "label",
        "kind",
        "children"
      ],
      "additionalProperties": false
    }
  },
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/__schema0"
          }
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_sitemap"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_sitemap"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  },
                  "enabled": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "id",
                  "name",
                  "enabled"
                ],
                "additionalProperties": false
              }
            },
            "nextCursor": {
              "type": "string"
            }
          },
          "required": [
            "items"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_workflows"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_list_workflows"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_replay_request`

**Purpose:** Replays exactly one bounded request after resolving its normalized destination and requiring one selected Caido scope to allow it. It never retries automatically.

**Mode:** active

**Side effects:** Performs the single bounded mutation described above; active mode is required.

**Annotations:** `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":false,"openWorldHint":true}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "requestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "headers": {
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "array",
        "prefixItems": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 256,
            "pattern": "^[!#$%&'*+\\-.^_`|~0-9A-Za-z]+$"
          },
          {
            "type": "string",
            "maxLength": 8192
          }
        ]
      }
    },
    "body": {
      "type": "string",
      "maxLength": 4096
    },
    "contentType": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    }
  },
  "required": [
    "requestId",
    "headers",
    "body",
    "contentType"
  ],
  "additionalProperties": false
}
```

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "summary": {
              "type": "string",
              "const": "Replayed one bounded request."
            },
            "evidence": {
              "type": "object",
              "properties": {
                "projectId": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "mutation": {
                  "type": "string",
                  "const": "replay_request"
                },
                "target": {
                  "type": "object",
                  "properties": {
                    "scheme": {
                      "type": "string",
                      "enum": [
                        "http",
                        "https"
                      ]
                    },
                    "host": {
                      "type": "string"
                    },
                    "port": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 65535
                    }
                  },
                  "required": [
                    "scheme",
                    "host",
                    "port"
                  ],
                  "additionalProperties": false
                }
              },
              "required": [
                "requestIds",
                "mutation",
                "target"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "summary",
            "evidence"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_replay_request"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_replay_request"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Active network operations require an allowed selected scope; management mutations remain bounded and explicit.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_run_workflow`

**Purpose:** Runs exactly one bounded Caido workflow and returns mutation evidence. It performs no automatic retry or follow-up action.

**Mode:** active

**Side effects:** Performs the single bounded mutation described above; active mode is required.

**Annotations:** `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":false,"openWorldHint":true}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "workflowId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "requestId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    }
  },
  "required": [
    "workflowId",
    "requestId"
  ],
  "additionalProperties": false
}
```

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "summary": {
              "type": "string",
              "const": "Ran one Caido workflow."
            },
            "evidence": {
              "type": "object",
              "properties": {
                "projectId": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "mutation": {
                  "type": "string",
                  "const": "run_workflow"
                }
              },
              "required": [
                "requestIds",
                "mutation"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "summary",
            "evidence"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_run_workflow"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_run_workflow"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Active network operations require an allowed selected scope; management mutations remain bounded and explicit.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_select_project`

**Purpose:** Selects exactly one existing Caido project and returns explicit mutation evidence. It performs no follow-up action and never retries automatically.

**Mode:** active

**Side effects:** Performs the single bounded mutation described above; active mode is required.

**Annotations:** `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    }
  },
  "required": [
    "projectId"
  ],
  "additionalProperties": false
}
```

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "summary": {
              "type": "string",
              "const": "Selected one Caido project."
            },
            "evidence": {
              "type": "object",
              "properties": {
                "projectId": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "mutation": {
                  "type": "string",
                  "const": "select_project"
                }
              },
              "required": [
                "projectId",
                "requestIds",
                "mutation"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "summary",
            "evidence"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_select_project"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_select_project"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Active network operations require an allowed selected scope; management mutations remain bounded and explicit.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_send_raw_request`

**Purpose:** Sends exactly one bounded HTTP request after normalizing scheme, host, and port and requiring one selected Caido scope to allow it. It never retries automatically.

**Mode:** active

**Side effects:** Performs the single bounded mutation described above; active mode is required.

**Annotations:** `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":false,"openWorldHint":true}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "method": {
      "type": "string",
      "enum": [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
      ]
    },
    "url": {
      "type": "string",
      "maxLength": 4096,
      "format": "uri"
    },
    "headers": {
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "array",
        "prefixItems": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 256,
            "pattern": "^[!#$%&'*+\\-.^_`|~0-9A-Za-z]+$"
          },
          {
            "type": "string",
            "maxLength": 8192
          }
        ]
      }
    },
    "body": {
      "type": "string",
      "maxLength": 4096
    }
  },
  "required": [
    "method",
    "url",
    "headers"
  ],
  "additionalProperties": false
}
```

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "summary": {
              "type": "string",
              "const": "Sent one bounded raw request."
            },
            "evidence": {
              "type": "object",
              "properties": {
                "projectId": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "mutation": {
                  "type": "string",
                  "const": "send_raw_request"
                },
                "target": {
                  "type": "object",
                  "properties": {
                    "scheme": {
                      "type": "string",
                      "enum": [
                        "http",
                        "https"
                      ]
                    },
                    "host": {
                      "type": "string"
                    },
                    "port": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 65535
                    }
                  },
                  "required": [
                    "scheme",
                    "host",
                    "port"
                  ],
                  "additionalProperties": false
                }
              },
              "required": [
                "requestIds",
                "mutation",
                "target"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "summary",
            "evidence"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_send_raw_request"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_send_raw_request"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Active network operations require an allowed selected scope; management mutations remain bounded and explicit.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_set_intercept`

**Purpose:** Sets Caido Intercept to one explicit enabled state and returns mutation evidence. The installed production SDK may return TOOL_DISABLED because it does not expose Intercept control. It never retries automatically.

**Mode:** active

**Side effects:** Performs the single bounded mutation described above; active mode is required.

**Annotations:** `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "enabled": {
      "type": "boolean"
    }
  },
  "required": [
    "enabled"
  ],
  "additionalProperties": false
}
```

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "summary": {
              "type": "string",
              "const": "Set Caido Intercept state."
            },
            "evidence": {
              "type": "object",
              "properties": {
                "projectId": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "mutation": {
                  "type": "string",
                  "const": "set_intercept"
                }
              },
              "required": [
                "requestIds",
                "mutation"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "summary",
            "evidence"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_set_intercept"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_set_intercept"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Active network operations require an allowed selected scope; management mutations remain bounded and explicit.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.

## `caido_update_finding`

**Purpose:** Updates exactly one Caido finding with bounded title and description fields. It never retries automatically.

**Mode:** active

**Side effects:** Performs the single bounded mutation described above; active mode is required.

**Annotations:** `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true,"openWorldHint":false}`

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "findingId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "description": {
      "type": "string",
      "maxLength": 4096
    }
  },
  "required": [
    "findingId",
    "title",
    "description"
  ],
  "additionalProperties": false
}
```

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": true
        },
        "data": {
          "type": "object",
          "properties": {
            "summary": {
              "type": "string",
              "const": "Updated one Caido finding."
            },
            "evidence": {
              "type": "object",
              "properties": {
                "projectId": {
                  "type": "string"
                },
                "requestIds": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "mutation": {
                  "type": "string",
                  "const": "update_finding"
                }
              },
              "required": [
                "requestIds",
                "mutation"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "summary",
            "evidence"
          ],
          "additionalProperties": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_update_finding"
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
          "additionalProperties": false
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "ok",
        "meta",
        "warnings",
        "data"
      ]
    },
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ok": {
          "type": "boolean",
          "const": false
        },
        "meta": {
          "type": "object",
          "properties": {
            "tool": {
              "type": "string",
              "const": "caido_update_finding"
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
          "additionalProperties": false
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
              "type": "string",
              "enum": [
                "AUTH_REQUIRED",
                "AUTH_FAILED",
                "CAIDO_UNREACHABLE",
                "INVALID_INPUT",
                "INVALID_HTTPQL",
                "NOT_FOUND",
                "OUT_OF_SCOPE",
                "TOOL_DISABLED",
                "TIMEOUT",
                "RATE_LIMITED",
                "UPSTREAM_ERROR",
                "INTERNAL_ERROR"
              ]
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
        "warnings",
        "error"
      ]
    }
  ]
}
```

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Active network operations require an allowed selected scope; management mutations remain bounded and explicit.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.
