"""
TechFlow Support Ticket Agent — full demo script.
Covers: agentic loop, structured output, adaptive thinking, streaming.

Run from your terminal:
    $env:ANTHROPIC_API_KEY = "sk-ant-..."   # set key first
    python Developer_Platform.py
"""
import anthropic
import json
import os
import time

# ── Setup ─────────────────────────────────────────────────────────────────────
key = os.environ.get("ANTHROPIC_API_KEY", "")
if not key:
    raise SystemExit(
        "ANTHROPIC_API_KEY is not set.\n"
        "Run:  $env:ANTHROPIC_API_KEY = 'sk-ant-...'  then retry."
    )

client = anthropic.Anthropic(api_key=key, timeout=900.0)
MODEL  = "claude-sonnet-4-6"

print(f"SDK : {anthropic.__version__}  |  Model : {MODEL}")

# Pre-flight check
test = client.messages.create(
    model=MODEL, max_tokens=64,
    messages=[{"role": "user", "content": "Reply with only: ready"}],
    thinking={"type": "adaptive"},
)
print(f"API : {''.join(b.text for b in test.content if b.type == 'text').strip()}")
print("🚀  Ready to build!\n")

# ── Sample data ───────────────────────────────────────────────────────────────
TICKETS = {
    "TKT-1042": {
        "id": "TKT-1042", "customer": "Acme Corp", "priority": "high",
        "product_area": "billing",
        "description": "We were charged twice for our March invoice. Invoice #INV-2024-0342 shows $4,500 but our bank shows two identical charges on March 3rd. Need immediate refund of the duplicate charge.",
        "status": "open",
    },
    "TKT-1043": {
        "id": "TKT-1043", "customer": "DataFlow Inc", "priority": "medium",
        "product_area": "api",
        "description": "Our webhook endpoint stopped receiving events after we rotated API keys yesterday. We've verified the new key works for REST calls but webhooks are still failing. Getting 401 errors in the webhook logs.",
        "status": "open",
    },
    "TKT-1044": {
        "id": "TKT-1044", "customer": "CloudScale Ltd", "priority": "low",
        "product_area": "feature_request",
        "description": "Would love to see bulk export functionality in the dashboard. Currently we have to export reports one at a time which is painful when we need quarterly summaries across 50+ projects.",
        "status": "open",
    },
    "TKT-1045": {
        "id": "TKT-1045", "customer": "SecureNet Systems", "priority": "critical",
        "product_area": "account",
        "description": "Our admin account (admin@securenet.io) is locked out after failed MFA attempts. We have 47 team members who can't access the platform because SSO is tied to this admin account. This is blocking all work.",
        "status": "open",
    },
    "TKT-1046": {
        "id": "TKT-1046", "customer": "MedTech Solutions", "priority": "high",
        "product_area": "api",
        "description": "Our production integration started returning intermittent 500 errors around 2am last night. About 15% of API calls are failing. We haven't changed anything on our end. Errors seem random - sometimes the same request works on retry. Our team in Singapore is blocked and we need this resolved ASAP.",
        "status": "open",
    },
}

KB_ARTICLES = {
    "KB-001": {"title": "Processing Duplicate Payment Refunds",
               "content": "For duplicate charges: 1) Verify the duplicate in the billing system, 2) Issue refund through the payment processor (takes 3-5 business days), 3) Send confirmation email with refund reference number. Escalate if amount exceeds $10,000."},
    "KB-002": {"title": "Webhook Authentication After Key Rotation",
               "content": "When API keys are rotated, webhook signing secrets must also be updated. Go to Settings > Webhooks > Edit endpoint, and regenerate the signing secret. The old secret is invalidated immediately on key rotation. Common mistake: rotating the API key but not the webhook signing secret."},
    "KB-003": {"title": "Bulk Export Feature (Roadmap)",
               "content": "Bulk export is on the Q3 roadmap. Workaround: Use the REST API's /reports/export endpoint with date range parameters to programmatically export multiple reports. See API docs for batch export examples."},
    "KB-004": {"title": "Admin Account Lockout Recovery",
               "content": "For locked admin accounts: 1) Verify identity through the secondary email on file, 2) Reset MFA through the admin recovery flow at /admin/recover, 3) Temporary access can be granted through support-level override (requires manager approval). Critical: If SSO is blocked, enable the bypass login at /login/direct for affected users."},
    "KB-005": {"title": "API Rate Limiting Best Practices",
               "content": "Default rate limits: 100 requests/minute for standard plans, 1000/minute for enterprise. Use exponential backoff with jitter for retries. Monitor usage via the X-RateLimit headers in responses."},
    "KB-006": {"title": "Invoice Discrepancy Resolution",
               "content": "For billing discrepancies: Check the billing audit log for the account, compare with payment processor records, and verify no pending transactions. Contact finance team for adjustments over $5,000."},
    "KB-007": {"title": "Intermittent 500 Errors Troubleshooting",
               "content": "For intermittent server errors: 1) Check the status page for known outages, 2) Review rate limit headers - 429s can masquerade as 500s behind load balancers, 3) Check if errors correlate with payload size or specific endpoints, 4) Enable request ID logging and contact support with specific request IDs for investigation. If >10% error rate persists for >1 hour, escalate to engineering."},
}

def get_ticket(ticket_id: str) -> str:
    t = TICKETS.get(ticket_id)
    return json.dumps(t) if t else json.dumps({"error": f"Ticket {ticket_id} not found"})

def search_kb(query: str) -> str:
    q = query.lower()
    hits = [{"id": k, **v} for k, v in KB_ARTICLES.items()
            if any(w in v["title"].lower() or w in v["content"].lower()
                   for w in q.split() if len(w) > 2)]
    return json.dumps(hits[:3] or [{"id": "KB-000", "title": "No matches",
                                     "content": "No relevant articles found."}])

def resolve_ticket(ticket_id: str, resolution: str, status: str = "resolved") -> str:
    t = TICKETS.get(ticket_id)
    if t:
        t["status"] = status
        t["resolution"] = resolution
        return json.dumps({"success": True, "ticket_id": ticket_id, "new_status": status})
    return json.dumps({"error": f"Ticket {ticket_id} not found"})

TOOL_FUNCTIONS = {"get_ticket": get_ticket, "search_kb": search_kb, "resolve_ticket": resolve_ticket}

def execute_tool(name: str, input_data: dict) -> str:
    fn = TOOL_FUNCTIONS.get(name)
    return fn(**input_data) if fn else json.dumps({"error": f"Unknown tool: {name}"})

print(f"Data loaded — {len(TICKETS)} tickets, {len(KB_ARTICLES)} KB articles\n")

# ── Tool schemas ──────────────────────────────────────────────────────────────
tools = [
    {
        "name": "get_ticket",
        "description": "Retrieve full details for a support ticket by its ID, including customer, priority, product area, and description.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {"type": "string", "description": "The ticket ID, e.g. TKT-1042"},
            },
            "required": ["ticket_id"],
        },
    },
    {
        "name": "search_kb",
        "description": "Search the internal knowledge base for relevant articles, procedures, and solutions. Always call this before resolving any ticket to ensure the resolution follows TechFlow policies.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string",
                          "description": "Keywords describing the issue, e.g. 'duplicate charge refund'"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "resolve_ticket",
        "description": "Close a ticket with a complete resolution message and final status. Call once after investigating.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id":  {"type": "string"},
                "resolution": {"type": "string"},
                "status":     {"type": "string",
                               "enum": ["resolved", "escalated", "pending_customer"]},
            },
            "required": ["ticket_id", "resolution", "status"],
        },
    },
]

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a Tier 1 support agent for TechFlow, a B2B SaaS platform.

Process: 1) look up the ticket, 2) search the KB, 3) resolve with specific steps.

Escalate for: financial issues >$10k, security compromises, engineering-level bugs, Enterprise SLA breaches.
Be empathetic, precise, and always verify policies in the KB before answering."""

# ── Structured output schema ──────────────────────────────────────────────────
RESOLUTION_SCHEMA = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {
            "diagnosis":        {"type": "string"},
            "solution_steps":   {"type": "array", "items": {"type": "string"}},
            "confidence":       {"type": "string", "enum": ["high", "medium", "low"]},
            "escalation_needed":{"type": "boolean"},
            "category":         {"type": "string",
                                 "enum": ["billing", "technical", "account", "feature_request"]},
        },
        "required": ["diagnosis", "solution_steps", "confidence", "escalation_needed", "category"],
        "additionalProperties": False,
    },
}

def get_structured_result(response) -> dict:
    text_blocks = [b for b in response.content if b.type == "text" and b.text.strip()]
    return json.loads(text_blocks[-1].text) if text_blocks else None

# ── Part 1: Agentic loop ──────────────────────────────────────────────────────
def run_agent(user_message: str):
    messages = [{"role": "user", "content": user_message}]
    response = client.messages.create(
        model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT,
        tools=tools, thinking={"type": "adaptive"}, messages=messages,
    )
    while response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"  🔧 {block.name}({json.dumps(block.input)[:70]})")
                result = execute_tool(block.name, block.input)
                print(f"     ↳ {result[:100]}")
                tool_results.append({"type": "tool_result",
                                     "tool_use_id": block.id, "content": result})
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user",      "content": tool_results})
        response = client.messages.create(
            model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT,
            tools=tools, thinking={"type": "adaptive"}, messages=messages,
        )
    return response

# ── Part 2: Structured output ─────────────────────────────────────────────────
def run_agent_structured(user_message: str) -> dict:
    messages = [{"role": "user", "content": user_message}]
    response = client.messages.create(
        model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT,
        tools=tools, thinking={"type": "adaptive"}, messages=messages,
    )
    while response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                tool_results.append({"type": "tool_result",
                                     "tool_use_id": block.id, "content": result})
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user",      "content": tool_results})
        response = client.messages.create(
            model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT,
            tools=tools, thinking={"type": "adaptive"}, messages=messages,
        )
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": "Provide your structured resolution as JSON."})
    final = client.messages.create(
        model=MODEL, max_tokens=8000, system=SYSTEM_PROMPT,
        output_config={"format": RESOLUTION_SCHEMA},
        tool_choice={"type": "none"},
        thinking={"type": "adaptive"}, messages=messages,
    )
    return get_structured_result(final)

# ── Part 3: Adaptive thinking with effort control ─────────────────────────────
def run_agent_thinking(user_message: str, effort: str = "high") -> dict:
    messages = [{"role": "user", "content": user_message}]
    response = client.messages.create(
        model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT,
        tools=tools, thinking={"type": "adaptive"},
        output_config={"effort": effort}, messages=messages,
    )
    while response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "thinking":
                print(f"  💭 [{effort}] {block.thinking[:200].replace(chr(10),' ')}…")
            elif block.type == "tool_use":
                print(f"  🔧 {block.name}({json.dumps(block.input)[:70]})")
                result = execute_tool(block.name, block.input)
                print(f"     ✅ {result[:100]}")
                tool_results.append({"type": "tool_result",
                                     "tool_use_id": block.id, "content": result})
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user",      "content": tool_results})
        response = client.messages.create(
            model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT,
            tools=tools, thinking={"type": "adaptive"},
            output_config={"effort": effort}, messages=messages,
        )
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": "Provide your structured resolution as JSON."})
    final = client.messages.create(
        model=MODEL, max_tokens=8000, system=SYSTEM_PROMPT,
        output_config={"effort": effort, "format": RESOLUTION_SCHEMA},
        tool_choice={"type": "none"},
        thinking={"type": "adaptive"}, messages=messages,
    )
    return get_structured_result(final)

# ── Part 4: Streaming ─────────────────────────────────────────────────────────
def run_agent_streaming(user_message: str, effort: str = "high") -> dict:
    messages = [{"role": "user", "content": user_message}]
    while True:
        current_tool = None
        with client.messages.stream(
            model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT,
            tools=tools, thinking={"type": "adaptive"},
            output_config={"effort": effort}, messages=messages,
        ) as stream:
            for event in stream:
                if event.type == "content_block_start":
                    btype = event.content_block.type
                    if btype == "thinking":
                        print("\n💭 ", end="", flush=True)
                    elif btype == "tool_use":
                        current_tool = event.content_block.name
                        print(f"\n🔧 {current_tool}(", end="", flush=True)
                    elif btype == "text":
                        print("\n📝 ", end="", flush=True)
                elif event.type == "content_block_delta":
                    d = event.delta
                    if d.type == "thinking_delta":
                        print(d.thinking[:50].replace("\n", " "), end="", flush=True)
                    elif d.type == "text_delta":
                        print(d.text, end="", flush=True)
                    elif d.type == "input_json_delta":
                        print(d.partial_json, end="", flush=True)
                elif event.type == "content_block_stop" and current_tool:
                    print(")", flush=True)
                    current_tool = None
            response = stream.get_final_message()

        if response.stop_reason != "tool_use":
            break

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                print(f"   ↳ {result[:120]}")
                tool_results.append({"type": "tool_result",
                                     "tool_use_id": block.id, "content": result})
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user",      "content": tool_results})

    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": "Provide your structured resolution as JSON."})
    print("\n\n📋 Structured resolution…\n")
    with client.messages.stream(
        model=MODEL, max_tokens=8000, system=SYSTEM_PROMPT,
        output_config={"effort": effort, "format": RESOLUTION_SCHEMA},
        tool_choice={"type": "none"},
        thinking={"type": "adaptive"}, messages=messages,
    ) as fs:
        for event in fs:
            if event.type == "content_block_delta" and event.delta.type == "text_delta":
                print(event.delta.text, end="", flush=True)
        final_response = fs.get_final_message()
    return get_structured_result(final_response)

# ══════════════════════════════════════════════════════════════════════════════
# DEMO — runs all three checkpoints
# ══════════════════════════════════════════════════════════════════════════════

# ── Checkpoint 1: basic agentic loop (TKT-1042 billing) ──────────────────────
print("=" * 60)
print("CHECKPOINT 1 — Agentic loop: TKT-1042 (duplicate billing)")
print("=" * 60)
r = run_agent("Resolve ticket TKT-1042")
for b in r.content:
    if b.type == "text" and b.text.strip():
        print(f"\n{b.text}")

print("\n✅ Structured output (TKT-1042):")
print(json.dumps(run_agent_structured("Resolve ticket TKT-1042"), indent=2))

# ── Checkpoint 2: adaptive thinking effort comparison (TKT-1046) ──────────────
print("\n" + "=" * 60)
print("CHECKPOINT 2 — Adaptive thinking: TKT-1046 (intermittent 500s)")
print("=" * 60)
for effort in ["high", "low"]:
    print(f"\n--- effort={effort} ---")
    t0 = time.time()
    res = run_agent_thinking("Resolve ticket TKT-1046", effort=effort)
    elapsed = time.time() - t0
    print(f"\n[{effort}] confidence={res['confidence']} | steps={len(res['solution_steps'])} "
          f"| escalate={res['escalation_needed']} | {elapsed:.1f}s")

# ── Checkpoint 3: streaming (TKT-1045 account lockout) ───────────────────────
print("\n" + "=" * 60)
print("CHECKPOINT 3 — Streaming: TKT-1045 (admin lockout, 47 users blocked)")
print("=" * 60)
t0 = time.time()
result = run_agent_streaming("Resolve ticket TKT-1045")
print(f"\n\nTotal: {time.time()-t0:.1f}s")
print("\nStructured Resolution:")
print(json.dumps(result, indent=2))
