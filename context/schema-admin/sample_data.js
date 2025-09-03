// Sample Schema Data for Report.AI Collaborative Schema Management
// This data demonstrates the database-backed structure with performance tables

const sampleSchemaData = {
  "version": 3,
  "description": "Production-ready collaborative schema management system",
  "database_backed": true,
  "features": [
    "Real-time collaboration",
    "Performance table management", 
    "Table validation rules",
    "MySQL persistence",
    "Multi-user editing"
  ],
  "products": [
    {
      "id": 1,
      "name": "Blended Tactics",
      "slug": "blended-tactics",
      "platforms": ["Xandr", "The Trade Desk"],
      "notes": "Multi-tactic programmatic campaigns with advanced targeting",
      "ai_guidelines": "Focus on cross-tactic optimization and budget allocation efficiency",
      "subproducts": [
        {
          "id": 1,
          "name": "Targeted Display",
          "slug": "targeted-display",
          "platforms": ["Xandr"],
          "notes": "Programmatic display with advanced targeting capabilities",
          "table_validator": {
            "requiredTables": ["Monthly Performance", "Campaign Performance"],
            "minimumTables": 2
          },
          "performance_tables": [
            {
              "id": 1,
              "table_name": "Monthly Performance",
              "table_slug": "monthly-performance", 
              "file_name": "report-targeted-display-monthly.csv",
              "headers": ["Date", "Impressions", "Clicks", "CTR", "Spend", "CPM", "Conversions", "CPA"],
              "aliases": ["monthly", "monthly-report"]
            },
            {
              "id": 2,
              "table_name": "Campaign Performance", 
              "table_slug": "campaign-performance",
              "file_name": "report-targeted-display-campaign.csv",
              "headers": ["Campaign", "Impressions", "Clicks", "CTR", "Spend", "Conversions"],
              "aliases": ["campaign", "campaign-report"]
            }
          ]
        }
          "tactic_types": [
            { "code": "RON", "name": "Run of Network", "aliases": [] },
            { "code": "AAT", "name": "Advanced Audience Targeting", "aliases": [] },
            { "code": "WTG", "name": "Website Targeting", "aliases": [] },
            { "code": "KWD", "name": "Keyword Targeting", "aliases": [] },
            { "code": "GEO", "name": "Geo Fencing", "aliases": ["HLM"] },
            { "code": "RTG", "name": "Retargeting", "aliases": [] },
            { "code": "CRM", "name": "CRM Targeting", "aliases": [] }
          ],
          "tables": [
            {
              "title": "Monthly Performance",
              "table_slug": "monthly-performance",
              "filenames": ["report-targeted-display-monthly.csv"],
              "aliases": ["monthly", "monthly-report"],
              "headers": ["Date", "Impressions", "Clicks", "CTR", "Spend", "Conversions"],
              "validator": { "required": ["Date", "Impressions", "Clicks"], "minColumns": 5 }
            }
          ],
          "lumina": { "extractors": [] },
          "ai": { 
            "guidelines": "Focus on tactic performance and audience targeting effectiveness",
            "platforms": {}, 
            "benchmarks": {
              "CTR": { "goal": 0.08, "warn_below": 0.05, "unit": "percentage", "direction": "higher_better" }
            }
          }
        },
        "Targeted Video": {
          "data_value": "targetedVideo",
          "filename_stem": "targeted-video",
          "platforms": ["Xandr"],
          "tactic_types": [
            { "code": "RON", "name": "Run of Network", "aliases": [] },
            { "code": "AAT", "name": "Advanced Audience Targeting", "aliases": [] },
            { "code": "WTG", "name": "Website Targeting", "aliases": [] },
            { "code": "KWD", "name": "Keyword Targeting", "aliases": [] },
            { "code": "GEO", "name": "Geo Fencing", "aliases": ["HLM"] },
            { "code": "RTG", "name": "Retargeting", "aliases": [] },
            { "code": "CRM", "name": "CRM Targeting", "aliases": [] }
          ],
          "tables": [],
          "lumina": { "extractors": [] },
          "ai": { 
            "guidelines": "Analyze video completion rates and engagement metrics",
            "platforms": {}, 
            "benchmarks": {
              "Completion Rate": { "goal": 0.75, "warn_below": 0.60, "unit": "ratio", "direction": "higher_better" }
            }
          }
        }
      },
      "lumina": { "extractors": [] },
      "ai": { 
        "guidelines": "Analyze multi-tactic blended campaigns with focus on cross-tactic optimization",
        "platforms": {
          "Xandr": { "notes": "Programmatic platform with advanced targeting options", "constraints": ["Budget pacing", "Frequency capping"] }
        },
        "benchmarks": {
          "CPM": { "goal": 8.0, "warn_below": 12.0, "unit": "USD", "direction": "lower_better" }
        }
      }
    },
    "STV": {
      "product_slug": "stv",
      "platforms": ["MadHive", "Hulu", "YouTube", "Polk"],
      "mediums": ["Video", "CTV", "OTT"],
      "kpis": ["CPM", "Completion Rate", "Reach", "Frequency"],
      "notes": "Streaming TV and Connected TV campaigns",
      "tactic_alias_glossary": {
        "AAT-STV": ["Advanced Audience Targeting OTT"],
        "CHN-STV": ["Channel Targeted OTT"],
        "STV-OTT": ["Streaming TV OTT"],
        "RON-STV": ["Run of Network STV"]
      },
      "subproducts": {
        "Advanced Audience Targeting OTT": {
          "data_value": "streamingStv",
          "filename_stem": "advanced-audience-targeting-ott",
          "platforms": ["MadHive"],
          "tactic_types": [
            { "code": "AAT-STV", "name": "Advanced Audience Targeting OTT", "aliases": [] }
          ],
          "tables": [
            {
              "title": "Campaign Performance",
              "table_slug": "campaign-performance",
              "filenames": ["report-advanced-audience-targeting-ott-campaign.csv"],
              "aliases": ["campaign", "campaign-report"],
              "headers": ["Campaign", "Impressions", "Completion Rate", "CPM", "Spend"],
              "validator": { "required": ["Campaign", "Impressions"], "minColumns": 4 }
            }
          ],
          "lumina": { "extractors": [] },
          "ai": { 
            "guidelines": "Focus on completion rates and audience precision",
            "platforms": {},
            "benchmarks": {
              "Completion Rate": { "goal": 0.85, "warn_below": 0.70, "unit": "ratio", "direction": "higher_better" }
            }
          }
        },
        "Hulu": {
          "data_value": "streamingStv",
          "filename_stem": "hulu",
          "platforms": ["Hulu"],
          "tactic_types": [
            { "code": "Hulu-AT", "name": "Hulu - Audience Targeted", "aliases": [] },
            { "code": "Hulu-RON", "name": "Hulu - RON", "aliases": [] }
          ],
          "tables": [],
          "lumina": { "extractors": [] },
          "ai": { 
            "guidelines": "Premium streaming inventory analysis",
            "platforms": {},
            "benchmarks": {}
          }
        },
        "YouTube TV": {
          "data_value": "youtubeTv",
          "filename_stem": "youtube-tv",
          "platforms": ["YouTube"],
          "tactic_types": [
            { "code": "AAT-30s", "name": "AAT 30s", "aliases": [] },
            { "code": "AAT-15s", "name": "AAT 15s", "aliases": [] },
            { "code": "RON-30s", "name": "RON 30s", "aliases": [] },
            { "code": "RON-15s", "name": "RON 15s", "aliases": [] }
          ],
          "tables": [],
          "lumina": { "extractors": [] },
          "ai": { 
            "guidelines": "YouTube TV specific metrics and performance",
            "platforms": {},
            "benchmarks": {}
          }
        }
      },
      "lumina": { "extractors": [
        {
          "name": "Creative Lengths",
          "path": "lineItems[].creative.lengthSeconds",
          "aggregate": "unique"
        }
      ] },
      "ai": { 
        "guidelines": "Analyze streaming TV performance with focus on completion rates and reach optimization",
        "platforms": {
          "MadHive": { "notes": "Premium CTV platform", "constraints": ["Inventory availability"] },
          "Hulu": { "notes": "Premium streaming service", "constraints": ["Content alignment"] }
        },
        "benchmarks": {
          "CPM": { "goal": 35.0, "warn_below": 50.0, "unit": "USD", "direction": "lower_better" },
          "Completion Rate": { "goal": 0.85, "warn_below": 0.70, "unit": "ratio", "direction": "higher_better" }
        }
      }
    },
    "Meta": {
      "product_slug": "meta",
      "platforms": ["Facebook"],
      "mediums": ["Social", "Display", "Video"],
      "kpis": ["CPM", "CPV", "CPPE", "Link Clicks", "ThruPlay"],
      "notes": "Facebook and Instagram advertising",
      "tactic_alias_glossary": {
        "FB-Link": ["Facebook - Link Click"],
        "FB-Aware": ["Facebook - Awareness"],
        "FB-ThruPlay": ["Facebook - ThruPlay"],
        "FB-Engage": ["Facebook - Post Engagement"],
        "FB-Lead": ["Facebook - Lead Gen"]
      },
      "subproducts": {
        "Facebook - Link Click": {
          "data_value": "meta",
          "filename_stem": "facebook-link-click",
          "platforms": ["Facebook"],
          "tactic_types": [
            { "code": "FB-Link", "name": "Facebook - Link Click", "aliases": [] }
          ],
          "tables": [],
          "lumina": { "extractors": [] },
          "ai": { 
            "guidelines": "Focus on click-through performance and cost efficiency",
            "platforms": {},
            "benchmarks": {
              "CPM": { "goal": 2.50, "warn_below": 4.00, "unit": "USD", "direction": "lower_better" }
            }
          }
        },
        "Facebook - Awareness": {
          "data_value": "meta",
          "filename_stem": "facebook-awareness",
          "platforms": ["Facebook"],
          "tactic_types": [
            { "code": "FB-Aware", "name": "Facebook - Awareness", "aliases": [] }
          ],
          "tables": [],
          "lumina": { "extractors": [] },
          "ai": { 
            "guidelines": "Analyze reach and frequency optimization",
            "platforms": {},
            "benchmarks": {
              "CPM": { "goal": 10.00, "warn_below": 15.00, "unit": "USD", "direction": "lower_better" }
            }
          }
        }
      },
      "lumina": { "extractors": [] },
      "ai": { 
        "guidelines": "Social media campaign analysis with emphasis on engagement and conversion tracking",
        "platforms": {
          "Facebook": { "notes": "Meta's primary advertising platform", "constraints": ["iOS 14.5 tracking limitations", "Attribution windows"] }
        },
        "benchmarks": {
          "CTR": { "goal": 1.2, "warn_below": 0.8, "unit": "percentage", "direction": "higher_better" }
        }
      }
    }
  }
};