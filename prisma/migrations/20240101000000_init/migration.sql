-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- HNSW index for approximate nearest-neighbour search on ai_memories
-- Run after Prisma creates the ai_memories table
CREATE INDEX IF NOT EXISTS ai_memory_embedding_hnsw_idx
  ON ai_memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text GIN index on ai_memories.content
CREATE INDEX IF NOT EXISTS ai_memory_content_gin_idx
  ON ai_memories USING GIN (to_tsvector('english', content));

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE features               ENABLE ROW LEVEL SECURITY;
ALTER TABLE epics                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE acceptance_criteria    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps               ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

-- Helper: check org membership
CREATE OR REPLACE FUNCTION is_org_member(org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()::text
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check org admin/owner
CREATE OR REPLACE FUNCTION is_org_admin(org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()::text
      AND role IN ('OWNER', 'ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (true); -- anyone can create an org (they become OWNER)

CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (is_org_admin(id));

-- Organization members
CREATE POLICY "member_select" ON organization_members
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "member_insert" ON organization_members
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "member_delete" ON organization_members
  FOR DELETE USING (is_org_admin(organization_id));

-- Projects
CREATE POLICY "project_select" ON projects
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "project_insert" ON projects
  FOR INSERT WITH CHECK (is_org_member(organization_id));

CREATE POLICY "project_update" ON projects
  FOR UPDATE USING (is_org_member(organization_id));

CREATE POLICY "project_delete" ON projects
  FOR DELETE USING (is_org_admin(organization_id));

-- Features
CREATE POLICY "feature_select" ON features
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE is_org_member(organization_id)
    )
  );

CREATE POLICY "feature_write" ON features
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE is_org_member(organization_id)
    )
  );

-- Epics
CREATE POLICY "epic_select" ON epics
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE is_org_member(organization_id)
    )
  );

CREATE POLICY "epic_write" ON epics
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE is_org_member(organization_id)
    )
  );

-- User stories
CREATE POLICY "story_select" ON user_stories
  FOR SELECT USING (
    epic_id IN (
      SELECT id FROM epics WHERE project_id IN (
        SELECT id FROM projects WHERE is_org_member(organization_id)
      )
    )
  );

CREATE POLICY "story_write" ON user_stories
  FOR ALL USING (
    epic_id IN (
      SELECT id FROM epics WHERE project_id IN (
        SELECT id FROM projects WHERE is_org_member(organization_id)
      )
    )
  );

-- Acceptance criteria
CREATE POLICY "ac_select" ON acceptance_criteria
  FOR SELECT USING (
    user_story_id IN (
      SELECT id FROM user_stories WHERE epic_id IN (
        SELECT id FROM epics WHERE project_id IN (
          SELECT id FROM projects WHERE is_org_member(organization_id)
        )
      )
    )
  );

CREATE POLICY "ac_write" ON acceptance_criteria
  FOR ALL USING (
    user_story_id IN (
      SELECT id FROM user_stories WHERE epic_id IN (
        SELECT id FROM epics WHERE project_id IN (
          SELECT id FROM projects WHERE is_org_member(organization_id)
        )
      )
    )
  );

-- Roadmaps
CREATE POLICY "roadmap_select" ON roadmaps
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE is_org_member(organization_id)
    )
  );

CREATE POLICY "roadmap_write" ON roadmaps
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE is_org_member(organization_id)
    )
  );

-- Roadmap items
CREATE POLICY "roadmap_item_select" ON roadmap_items
  FOR SELECT USING (
    roadmap_id IN (
      SELECT id FROM roadmaps WHERE project_id IN (
        SELECT id FROM projects WHERE is_org_member(organization_id)
      )
    )
  );

CREATE POLICY "roadmap_item_write" ON roadmap_items
  FOR ALL USING (
    roadmap_id IN (
      SELECT id FROM roadmaps WHERE project_id IN (
        SELECT id FROM projects WHERE is_org_member(organization_id)
      )
    )
  );

-- AI memories
CREATE POLICY "ai_memory_select" ON ai_memories
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "ai_memory_write" ON ai_memories
  FOR ALL USING (is_org_member(organization_id));

-- AI conversations
CREATE POLICY "ai_conversation_select" ON ai_conversations
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "ai_conversation_write" ON ai_conversations
  FOR ALL USING (user_id = auth.uid()::text);

-- AI messages
CREATE POLICY "ai_message_select" ON ai_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "ai_message_write" ON ai_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()::text
    )
  );

-- Knowledge edges
CREATE POLICY "edge_select" ON knowledge_edges
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "edge_write" ON knowledge_edges
  FOR ALL USING (is_org_member(organization_id));

-- Audit logs (read-only via RLS — writes go through service role only)
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT USING (is_org_member(organization_id));
