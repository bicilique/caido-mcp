# Roadmap

Item berikut sengaja ditunda dan tidak didaftarkan atau tersedia sebagai tool MCP rilis pertama:

- deleting projects;
- deleting scopes;
- deleting findings;
- dropping intercepted requests;
- high-volume fuzzing;
- active scanning;
- race-condition attack tooling;
- out-of-scope overrides;
- arbitrary plugin RPC;
- arbitrary GraphQL;
- remote internet-exposed MCP transport.

Alasannya adalah blast radius, kebutuhan otorisasi/policy tambahan, stabilitas API, atau risiko melewati audit Caido. Setiap kandidat memerlukan threat model, schema/adapter sempit, scope/mode gate, test RED, audit event, dokumentasi, dan persetujuan desain baru. Tidak ada placeholder tool untuk item ini.
