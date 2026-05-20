-- ============================================================
-- Solar Planner — Supabase Schema
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID    REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                 TEXT,
  google_solar_api_key  TEXT,   -- clé API stockée côté serveur
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture profil personnel"  ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Mise à jour profil personnel" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── Projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT    NOT NULL DEFAULT 'Projet sans titre',
  address           TEXT,
  lat               FLOAT8,
  lng               FLOAT8,
  segments          JSONB   DEFAULT '[]',
  report_params     JSONB   DEFAULT '{"costPerKWp":1400,"electricityPrice":0.25,"performanceRatio":0.80}',
  micro_inverters   JSONB   DEFAULT '[]',
  disabled_panel_ids JSONB  DEFAULT '{}',
  panel_orientation TEXT    DEFAULT 'portrait',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD projets personnels" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

-- ── Auto-create profile on signup ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
