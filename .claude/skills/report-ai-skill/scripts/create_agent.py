#!/usr/bin/env python3
"""
Agent Creator for Report AI Intelligence Flywheel

Creates new specialized AI agent configurations for the multi-agent reporting system.
Generates system prompts, context loaders, validation rules, and Cloudflare Workers.

Usage:
    python create_agent.py --type platform --name facebook --format cloudflare
    python create_agent.py --type industry --name healthcare --output-dir ./agents/
"""

import argparse
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional


AGENT_TEMPLATES = {
    'platform': {
        'role_prefix': 'Platform Expert',
        'expertise_focus': 'platform-specific quirks, best practices, and optimization strategies',
        'responsibilities': [
            'Identify platform-specific issues and opportunities',
            'Apply platform best practices to analysis',
            'Flag platform quirks that affect performance interpretation',
            'Recommend platform-specific optimizations'
        ],
        'output_sections': ['platform_health_check', 'platform_specific_insights', 'platform_optimizations', 'platform_warnings']
    },
    'industry': {
        'role_prefix': 'Industry Expert',
        'expertise_focus': 'industry benchmarks, seasonality patterns, and vertical-specific insights',
        'responsibilities': [
            'Compare performance to industry benchmarks',
            'Identify industry-specific patterns',
            'Account for seasonality in analysis',
            'Provide industry-contextualized recommendations'
        ],
        'output_sections': ['benchmark_comparison', 'industry_insights', 'seasonal_considerations', 'competitive_positioning']
    },
    'tactic': {
        'role_prefix': 'Tactic Expert',
        'expertise_focus': 'tactic-specific optimization, KPI analysis, and performance improvement',
        'responsibilities': [
            'Analyze tactic-specific KPIs',
            'Identify optimization opportunities',
            'Detect tactic-specific warning signs',
            'Recommend tactic improvements'
        ],
        'output_sections': ['tactic_performance', 'kpi_analysis', 'optimization_opportunities', 'tactic_recommendations']
    },
    'orchestrator': {
        'role_prefix': 'Report Orchestrator',
        'expertise_focus': 'synthesizing expert analyses into cohesive, actionable reports',
        'responsibilities': [
            'Synthesize insights from all expert agents',
            'Prioritize recommendations by impact',
            'Identify cross-platform opportunities',
            'Create cohesive narrative from disparate analyses'
        ],
        'output_sections': ['executive_summary', 'key_findings', 'prioritized_recommendations', 'action_items']
    }
}


def generate_system_prompt(agent_type: str, agent_name: str) -> str:
    """Generate system prompt for an agent."""
    template = AGENT_TEMPLATES.get(agent_type, AGENT_TEMPLATES['platform'])
    responsibilities = "\n".join(f"- {r}" for r in template['responsibilities'])
    output_sections = "\n".join(f"- {s}" for s in template['output_sections'])
    
    return f"""<agent_identity>
<role>{template['role_prefix']}: {agent_name.replace('_', ' ').title()}</role>
<expertise>{template['expertise_focus']}</expertise>
<created>{datetime.now().isoformat()}</created>
</agent_identity>

<core_responsibilities>
{responsibilities}
</core_responsibilities>

<analysis_approach>
You are a specialized expert in the Intelligence Flywheel multi-agent system.
Your analysis will be combined with other experts by the Orchestrator agent.

When analyzing data:
1. Focus ONLY on your area of expertise ({agent_type}: {agent_name})
2. Be specific and quantitative - cite actual numbers
3. Compare to relevant benchmarks when available
4. Flag issues with severity levels (Critical, Warning, Info)
5. Provide actionable recommendations with expected impact

Do NOT:
- Make observations outside your expertise
- Provide vague or unquantified insights
- Duplicate analysis that other experts will provide
</analysis_approach>

<output_structure>
Your response must include:
{output_sections}

Format each insight as:
- Observation: [What you found]
- Evidence: [Specific data points]
- Impact: [Why it matters]
- Recommendation: [What to do]
</output_structure>

<quality_standards>
- Every claim must reference specific data
- Comparisons must cite the benchmark source
- Recommendations must include expected impact
- Warnings must include severity and urgency
</quality_standards>"""


def generate_context_loader(agent_type: str, agent_name: str) -> str:
    """Generate context loader code for an agent."""
    class_name = agent_name.title().replace('_', '')
    
    return f'''#!/usr/bin/env python3
"""
Context Loader for {agent_name.replace('_', ' ').title()} ({agent_type.title()} Expert)
Generated: {datetime.now().isoformat()}
"""

import json
from typing import Dict, Any, Optional


class {class_name}ContextLoader:
    """Loads relevant context for the {agent_name} {agent_type} expert agent."""
    
    def __init__(self, knowledge_base_path: str = "./knowledge"):
        self.knowledge_base_path = knowledge_base_path
        self._cache = {{}}
    
    def load_context(self, campaign_data: Dict[str, Any], include_benchmarks: bool = True) -> str:
        """Load context relevant to this agent's expertise."""
        context_parts = []
        
        # Load {agent_type}-specific knowledge
        knowledge = self._load_knowledge("{agent_name}")
        if knowledge:
            context_parts.append(self._format_context(knowledge))
        
        if include_benchmarks:
            benchmarks = self._load_benchmarks("{agent_name}")
            if benchmarks:
                context_parts.append(self._format_benchmarks(benchmarks))
        
        return "\\n\\n".join(context_parts)
    
    def _load_knowledge(self, name: str) -> Optional[Dict]:
        try:
            with open(f"{{self.knowledge_base_path}}/{agent_type}s/{{name}}.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return None
    
    def _load_benchmarks(self, name: str) -> Optional[Dict]:
        try:
            with open(f"{{self.knowledge_base_path}}/benchmarks/{{name}}.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return None
    
    def _format_context(self, knowledge: Dict) -> str:
        return f"""<{agent_type}_expertise name="{agent_name}">
{{json.dumps(knowledge, indent=2)}}
</{agent_type}_expertise>"""
    
    def _format_benchmarks(self, benchmarks: Dict) -> str:
        return f"""<benchmarks source="{agent_name}">
{{json.dumps(benchmarks, indent=2)}}
</benchmarks>"""
    
    def get_token_estimate(self, context: str) -> int:
        return len(context) // 4


def load_context(campaign_data: Dict[str, Any], **kwargs) -> str:
    loader = {class_name}ContextLoader()
    return loader.load_context(campaign_data, **kwargs)


if __name__ == "__main__":
    test_data = {{"campaign_id": "test", "platform": "{agent_name}"}}
    loader = {class_name}ContextLoader()
    print(f"Context loader for {agent_name} initialized")
'''


def generate_cloudflare_worker(agent_type: str, agent_name: str, system_prompt: str) -> str:
    """Generate Cloudflare Worker code for the agent."""
    escaped_prompt = system_prompt.replace('`', '\\`').replace('${', '\\${')
    
    return f'''/**
 * {agent_name.replace('_', ' ').title()} Expert Agent
 * Cloudflare Worker for Report AI Intelligence Flywheel
 * Type: {agent_type}
 * Generated: {datetime.now().isoformat()}
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AgentRequest {{
    campaignData: any;
    performanceData: string;
    context?: string;
}}

export interface AgentResponse {{
    agent: string;
    agentType: string;
    insights: any[];
    recommendations: any[];
    warnings: any[];
    confidence: number;
    tokensUsed: number;
}}

const SYSTEM_PROMPT = `{escaped_prompt}`;

export async function runAgent(
    request: AgentRequest,
    env: {{ ANTHROPIC_API_KEY: string }}
): Promise<AgentResponse> {{
    const anthropic = new Anthropic({{ apiKey: env.ANTHROPIC_API_KEY }});

    const userMessage = `
<campaign_data>
${{JSON.stringify(request.campaignData, null, 2)}}
</campaign_data>

<performance_data>
${{request.performanceData}}
</performance_data>

Analyze this campaign data from your perspective as the {agent_name.replace('_', ' ').title()} expert.
`;

    const response = await anthropic.messages.create({{
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        system: [
            {{ type: "text", text: SYSTEM_PROMPT, cache_control: {{ type: "ephemeral" }} }},
            {{ type: "text", text: request.context || "", cache_control: {{ type: "ephemeral" }} }}
        ],
        messages: [{{ role: "user", content: userMessage }}]
    }});

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    return {{
        agent: "{agent_name}",
        agentType: "{agent_type}",
        insights: [],
        recommendations: [],
        warnings: [],
        confidence: 0.85,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
    }};
}}

export default {{
    async fetch(request: Request, env: {{ ANTHROPIC_API_KEY: string }}): Promise<Response> {{
        if (request.method !== "POST") return new Response("Method not allowed", {{ status: 405 }});
        
        try {{
            const body: AgentRequest = await request.json();
            const result = await runAgent(body, env);
            return new Response(JSON.stringify(result), {{ headers: {{ "Content-Type": "application/json" }} }});
        }} catch (error) {{
            return new Response(JSON.stringify({{ error: String(error) }}), {{ status: 500, headers: {{ "Content-Type": "application/json" }} }});
        }}
    }}
}};
'''


def generate_validator(agent_type: str, agent_name: str) -> str:
    """Generate validation rules for the agent's output."""
    class_name = agent_name.title().replace('_', '')
    sections = json.dumps(AGENT_TEMPLATES.get(agent_type, {}).get('output_sections', []))
    
    return f'''#!/usr/bin/env python3
"""
Validator for {agent_name.replace('_', ' ').title()} ({agent_type.title()} Expert)
Generated: {datetime.now().isoformat()}
"""

import json
import re
import sys
from typing import Dict, List, Tuple, Any


class {class_name}Validator:
    """Validates output from the {agent_name} agent."""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.required_sections = {sections}
    
    def validate(self, output: str) -> Tuple[bool, Dict[str, Any]]:
        self.errors = []
        self.warnings = []
        
        self._check_sections(output)
        self._check_quantification(output)
        self._check_recommendations(output)
        
        is_valid = len(self.errors) == 0
        score = max(0, 100 - len(self.errors) * 20 - len(self.warnings) * 5)
        
        return is_valid, {{"valid": is_valid, "errors": self.errors, "warnings": self.warnings, "score": score}}
    
    def _check_sections(self, output: str) -> None:
        for section in self.required_sections:
            if section.lower() not in output.lower():
                self.warnings.append(f"Missing section: {{section}}")
    
    def _check_quantification(self, output: str) -> None:
        numbers = re.findall(r'\\d+\\.?\\d*%?', output)
        if len(numbers) < 3:
            self.errors.append("Output lacks quantified insights")
    
    def _check_recommendations(self, output: str) -> None:
        if re.search(r'recommend|suggest|should', output.lower()):
            if not re.search(r'impact|result|improve|increase|decrease', output.lower()):
                self.warnings.append("Recommendations should include expected impact")


def validate_output(output: str) -> Tuple[bool, Dict[str, Any]]:
    validator = {class_name}Validator()
    return validator.validate(output)


if __name__ == "__main__":
    output = sys.stdin.read() if len(sys.argv) == 1 else open(sys.argv[1]).read()
    is_valid, details = validate_output(output)
    print(f"Valid: {{is_valid}}\\nScore: {{details['score']}}/100")
    if details['errors']:
        print("Errors:", details['errors'])
    if details['warnings']:
        print("Warnings:", details['warnings'])
    sys.exit(0 if is_valid else 1)
'''


def create_agent(agent_type: str, agent_name: str, output_dir: str, output_format: str = "all") -> Dict[str, str]:
    """Create a complete agent package."""
    files = {}
    
    system_prompt = generate_system_prompt(agent_type, agent_name)
    files[f"{agent_name}_system_prompt.txt"] = system_prompt
    files[f"{agent_name}_context_loader.py"] = generate_context_loader(agent_type, agent_name)
    files[f"{agent_name}_validator.py"] = generate_validator(agent_type, agent_name)
    
    if output_format in ["all", "cloudflare"]:
        files[f"{agent_name}_worker.ts"] = generate_cloudflare_worker(agent_type, agent_name, system_prompt)
    
    files[f"{agent_name}_config.json"] = json.dumps({
        "agent_name": agent_name,
        "agent_type": agent_type,
        "created": datetime.now().isoformat(),
        "files": list(files.keys()),
    }, indent=2)
    
    os.makedirs(output_dir, exist_ok=True)
    for filename, content in files.items():
        with open(os.path.join(output_dir, filename), 'w') as f:
            f.write(content)
        print(f"Created: {os.path.join(output_dir, filename)}")
    
    return files


def main():
    parser = argparse.ArgumentParser(description='Create a new Report AI expert agent')
    parser.add_argument('--type', '-t', required=True, choices=['platform', 'industry', 'tactic', 'orchestrator'])
    parser.add_argument('--name', '-n', required=True, help='Name of the agent')
    parser.add_argument('--output-dir', '-o', default='./agents')
    parser.add_argument('--format', '-f', default='all', choices=['all', 'cloudflare', 'python'])
    
    args = parser.parse_args()
    
    print(f"Creating {args.type} agent: {args.name}")
    files = create_agent(args.type, args.name, args.output_dir, args.format)
    print(f"Created {len(files)} files")
    
    return 0


if __name__ == '__main__':
    exit(main())
