-- Seed legacy data from MySQL export
-- This transforms and inserts the legacy products/subproducts/tactic_types

-- Clear existing seed data (keep platforms and industries)
DELETE FROM tactic_types;
DELETE FROM subproducts;
DELETE FROM products;

-- Insert Products (mapped from legacy schema)
INSERT INTO products (id, name, data_value, is_active, sort_order, created_at) VALUES
  (gen_random_uuid(), 'Google Ads', 'google-ads', true, 1, NOW()),
  (gen_random_uuid(), 'Email Marketing', 'email_marketing', true, 2, NOW()),
  (gen_random_uuid(), 'Beta', 'beta', true, 3, NOW()),
  (gen_random_uuid(), 'Programmatic Audio', 'programmatic_audio', true, 4, NOW()),
  (gen_random_uuid(), 'Addressable Solutions', 'addressable_solutions', true, 5, NOW()),
  (gen_random_uuid(), 'Blended Tactics', 'blended_tactics', true, 6, NOW()),
  (gen_random_uuid(), 'STV', 'stv', true, 7, NOW()),
  (gen_random_uuid(), 'Meta', 'meta', true, 8, NOW()),
  (gen_random_uuid(), 'Snapchat', 'snapchat', true, 9, NOW()),
  (gen_random_uuid(), 'TikTok', 'tiktok', true, 10, NOW()),
  (gen_random_uuid(), 'Twitter', 'twitter', true, 11, NOW()),
  (gen_random_uuid(), 'Pinterest', 'pinterest', true, 12, NOW()),
  (gen_random_uuid(), 'LinkedIn', 'linkedin', true, 13, NOW()),
  (gen_random_uuid(), 'SEM', 'sem', true, 14, NOW()),
  (gen_random_uuid(), 'Spark', 'spark', true, 15, NOW()),
  (gen_random_uuid(), 'YouTube', 'youtube', true, 16, NOW()),
  (gen_random_uuid(), 'Ignite Network', 'ignite_network', true, 17, NOW()),
  (gen_random_uuid(), 'SSM', 'ssm', true, 18, NOW()),
  (gen_random_uuid(), 'CPM Display', 'cpm_display', true, 19, NOW()),
  (gen_random_uuid(), 'Takeovers', 'takeovers', true, 20, NOW()),
  (gen_random_uuid(), 'Sponsorship', 'sponsorship', true, 21, NOW()),
  (gen_random_uuid(), 'Digital Endorsements', 'digital_endorsements', true, 22, NOW());

-- Insert Subproducts (linked to products by name lookup)
-- Google Ads subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Search Campaigns', 'search-campaigns', true, 1, NOW()
FROM products p WHERE p.data_value = 'google-ads';

-- Email Marketing subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, '1:1 Marketing', '1_1_marketing', true, 1, NOW()
FROM products p WHERE p.data_value = 'email_marketing';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'B2B (Business Targeting)', 'b2b_business_targeting', true, 2, NOW()
FROM products p WHERE p.data_value = 'email_marketing';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'B2C (Consumer Targeting)', 'b2c_consumer_targeting', true, 3, NOW()
FROM products p WHERE p.data_value = 'email_marketing';

-- Beta subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Premium Plus', 'premium_plus', true, 1, NOW()
FROM products p WHERE p.data_value = 'beta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Nextdoor', 'nextdoor', true, 2, NOW()
FROM products p WHERE p.data_value = 'beta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Netflix', 'netflix', true, 3, NOW()
FROM products p WHERE p.data_value = 'beta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Demand Gen', 'demand_gen', true, 4, NOW()
FROM products p WHERE p.data_value = 'beta';

-- Programmatic Audio subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Advanced Audience Targeting', 'advanced_audience_targeting', true, 1, NOW()
FROM products p WHERE p.data_value = 'programmatic_audio';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Run of Network', 'run_of_network_audio', true, 2, NOW()
FROM products p WHERE p.data_value = 'programmatic_audio';

-- Addressable Solutions subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Addressable Display', 'addressable_display', true, 1, NOW()
FROM products p WHERE p.data_value = 'addressable_solutions';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Geofencing with Foot Traffic', 'geofencing_foot_traffic', true, 2, NOW()
FROM products p WHERE p.data_value = 'addressable_solutions';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Addressable STV', 'addressable_stv', true, 3, NOW()
FROM products p WHERE p.data_value = 'addressable_solutions';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Addressable Video', 'addressable_video', true, 4, NOW()
FROM products p WHERE p.data_value = 'addressable_solutions';

-- Blended Tactics subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Targeted Display', 'targeted_display', true, 1, NOW()
FROM products p WHERE p.data_value = 'blended_tactics';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Social Display', 'social_display', true, 2, NOW()
FROM products p WHERE p.data_value = 'blended_tactics';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Targeted Native', 'targeted_native', true, 3, NOW()
FROM products p WHERE p.data_value = 'blended_tactics';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Targeted Video', 'targeted_video', true, 4, NOW()
FROM products p WHERE p.data_value = 'blended_tactics';

-- STV subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Video', 'stv_video', true, 1, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Advanced Audience Targeting OTT', 'advanced_audience_targeting_ott', true, 2, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Channel Targeted OTT', 'channel_targeted_ott', true, 3, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Streaming TV OTT', 'streaming_tv_ott', true, 4, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Run of Network', 'run_of_network_stv', true, 5, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Hulu - Audience Targeted', 'hulu_audience_targeted', true, 6, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Hulu - RON', 'hulu_ron', true, 7, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Polk', 'polk', true, 8, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'YouTube TV - Audience Targeted', 'youtube_tv_audience_targeted', true, 9, NOW()
FROM products p WHERE p.data_value = 'stv';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'YouTube TV - Run of Network', 'youtube_tv_ron', true, 10, NOW()
FROM products p WHERE p.data_value = 'stv';

-- Meta subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Facebook - Link Click', 'facebook_link_click', true, 1, NOW()
FROM products p WHERE p.data_value = 'meta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Facebook - Awareness', 'facebook_awareness', true, 2, NOW()
FROM products p WHERE p.data_value = 'meta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Facebook - ThruPlay', 'facebook_thruplay', true, 3, NOW()
FROM products p WHERE p.data_value = 'meta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Facebook - Post Engagement', 'facebook_post_engagement', true, 4, NOW()
FROM products p WHERE p.data_value = 'meta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Facebook - Lead Gen', 'facebook_lead_gen', true, 5, NOW()
FROM products p WHERE p.data_value = 'meta';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Link Click', 'meta_link_click', true, 6, NOW()
FROM products p WHERE p.data_value = 'meta';

-- Snapchat subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Snapchat - Aware', 'snapchat_aware', true, 1, NOW()
FROM products p WHERE p.data_value = 'snapchat';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Snapchat - Swipe Up', 'snapchat_swipe_up', true, 2, NOW()
FROM products p WHERE p.data_value = 'snapchat';

-- TikTok subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'TikTok - Awareness', 'tiktok_awareness', true, 1, NOW()
FROM products p WHERE p.data_value = 'tiktok';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'TikTok - Link Click', 'tiktok_link_click', true, 2, NOW()
FROM products p WHERE p.data_value = 'tiktok';

-- Twitter subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Twitter - Link Click', 'twitter_link_click', true, 1, NOW()
FROM products p WHERE p.data_value = 'twitter';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Twitter - Awareness', 'twitter_awareness', true, 2, NOW()
FROM products p WHERE p.data_value = 'twitter';

-- Pinterest subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Pinterest - Link Click', 'pinterest_link_click', true, 1, NOW()
FROM products p WHERE p.data_value = 'pinterest';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Pinterest - Awareness', 'pinterest_awareness', true, 2, NOW()
FROM products p WHERE p.data_value = 'pinterest';

-- LinkedIn subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'LinkedIn - Link Click', 'linkedin_link_click', true, 1, NOW()
FROM products p WHERE p.data_value = 'linkedin';

-- SEM subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'SEM', 'sem_main', true, 1, NOW()
FROM products p WHERE p.data_value = 'sem';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Google Search', 'google_search', true, 2, NOW()
FROM products p WHERE p.data_value = 'sem';

-- Spark subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Spark', 'spark_main', true, 1, NOW()
FROM products p WHERE p.data_value = 'spark';

-- YouTube subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'YouTube True View', 'youtube_true_view', true, 1, NOW()
FROM products p WHERE p.data_value = 'youtube';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'YouTube Bumper', 'youtube_bumper', true, 2, NOW()
FROM products p WHERE p.data_value = 'youtube';

-- Ignite Network subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Ignite Network - Banner Ads', 'ignite_network_banner_ads', true, 1, NOW()
FROM products p WHERE p.data_value = 'ignite_network';

-- SSM subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Sponsored Social Mentions - Link Click', 'ssm_link_click', true, 1, NOW()
FROM products p WHERE p.data_value = 'ssm';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Sponsored Social Mentions - Awareness', 'ssm_awareness', true, 2, NOW()
FROM products p WHERE p.data_value = 'ssm';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Sponsored Social Mentions - ThruPlay', 'ssm_thruplay', true, 3, NOW()
FROM products p WHERE p.data_value = 'ssm';

-- CPM Display subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Banner Ads', 'banner_ads', true, 1, NOW()
FROM products p WHERE p.data_value = 'cpm_display';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Amplifier', 'amplifier', true, 2, NOW()
FROM products p WHERE p.data_value = 'cpm_display';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Ignite Network', 'ignite_network_display', true, 3, NOW()
FROM products p WHERE p.data_value = 'cpm_display';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Local Network', 'local_network', true, 4, NOW()
FROM products p WHERE p.data_value = 'cpm_display';

INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Mobile Billboard', 'mobile_billboard', true, 5, NOW()
FROM products p WHERE p.data_value = 'cpm_display';

-- Takeovers subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Station Site Takeovers', 'station_site_takeovers', true, 1, NOW()
FROM products p WHERE p.data_value = 'takeovers';

-- Sponsorship subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Content Sponsorship', 'content_sponsorship', true, 1, NOW()
FROM products p WHERE p.data_value = 'sponsorship';

-- Digital Endorsements subproducts
INSERT INTO subproducts (id, product_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), p.id, 'Endorsement Package', 'endorsement_package', true, 1, NOW()
FROM products p WHERE p.data_value = 'digital_endorsements';

-- Insert sample tactic types for key subproducts
INSERT INTO tactic_types (id, subproduct_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), s.id, 'Keywords Report', 'google_ads_keywords', true, 1, NOW()
FROM subproducts s WHERE s.data_value = 'search-campaigns';

INSERT INTO tactic_types (id, subproduct_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), s.id, 'Campaign Performance', 'campaign_performance', true, 2, NOW()
FROM subproducts s WHERE s.data_value = 'search-campaigns';

INSERT INTO tactic_types (id, subproduct_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), s.id, 'Monthly Performance', 'monthly_performance', true, 1, NOW()
FROM subproducts s WHERE s.data_value = 'facebook_link_click';

INSERT INTO tactic_types (id, subproduct_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), s.id, 'Ad Set Performance', 'ad_set_performance', true, 2, NOW()
FROM subproducts s WHERE s.data_value = 'facebook_link_click';

INSERT INTO tactic_types (id, subproduct_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), s.id, 'Monthly Performance', 'monthly_performance', true, 1, NOW()
FROM subproducts s WHERE s.data_value = 'targeted_display';

INSERT INTO tactic_types (id, subproduct_id, name, data_value, is_active, sort_order, created_at)
SELECT gen_random_uuid(), s.id, 'Tactic Performance', 'tactic_performance', true, 2, NOW()
FROM subproducts s WHERE s.data_value = 'targeted_display';
