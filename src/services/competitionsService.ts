import supabase, { isPlaceholderConfig } from '../lib/supabaseClient';

export interface Competition {
  id: string;
  creator_id: string;
  test_id: string;
  title: string;
  description?: string;
  banner_image?: string;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  max_participants?: number;
  visibility: 'public' | 'private';
  status: 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled';
  prize_details?: string;
  rules?: string;
  organizer_contact?: string;
  leaderboard_type: 'live' | 'after_end' | 'hide';
  winner_visibility: 'public' | 'anonymous' | 'private';
  winners_announced: boolean;
  created_at: string;
  tests?: any; // linked test details
  creator_name?: string; // resolved creator name
}

// Initial Mock Data
const INITIAL_MOCK_COMPETITIONS = [
  {
    id: 'mock-comp-1',
    creator_id: 'jane-challenger',
    test_id: 'java-mock-test',
    title: 'National Java Programming Championship 2026',
    description: 'Showcase your Java skills in this nationwide competition. Compete against top developers and win exciting prizes!',
    banner_image: 'from-amber-600 to-orange-600',
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // starts in 2 hours
    end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    registration_deadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // ends in 1 hour
    max_participants: 500,
    visibility: 'public',
    status: 'upcoming',
    prize_details: '🥇 1st Prize: $1,000 + Tech Gadgets\n🥈 2nd Prize: $500\n🥉 3rd Prize: $250',
    rules: '1. Individual participation only.\n2. Standard proctoring rules apply (no tab switches, full-screen required).\n3. Any copying will lead to immediate disqualification.',
    organizer_contact: 'competitions@testoriax.io',
    leaderboard_type: 'live',
    winner_visibility: 'public',
    winners_announced: false,
    created_at: new Date().toISOString(),
    creator_name: 'Mahak Gupta'
  },
  {
    id: 'mock-comp-2',
    creator_id: 'aris-thorne',
    test_id: 'test-1',
    title: 'Python OOP Mastery Hackathon',
    description: 'A high-intensity competition testing your object-oriented design and Python optimization patterns.',
    banner_image: 'from-violet-600 to-indigo-600',
    start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // started 30 mins ago
    end_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // ends in 1 hour
    registration_deadline: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // deadline past
    max_participants: 250,
    visibility: 'public',
    status: 'live',
    prize_details: '🥇 1st Prize: Python Developer Toolkit + $500\n🥈 2nd Prize: JetBrains 1-year License',
    rules: '1. No external libraries allowed.\n2. Code must run within standard time limits.\n3. Solutions will be checked for plagiarism.',
    organizer_contact: 'challenges@testoriax.io',
    leaderboard_type: 'live',
    winner_visibility: 'public',
    winners_announced: false,
    created_at: new Date().toISOString(),
    creator_name: 'Dr. Aris Thorne'
  }
];

// LocalStorage helpers for Mock Data
const getStoredCompetitions = (): Competition[] => {
  const data = localStorage.getItem('testoriax_competitions');
  if (!data) {
    localStorage.setItem('testoriax_competitions', JSON.stringify(INITIAL_MOCK_COMPETITIONS));
    return INITIAL_MOCK_COMPETITIONS as any[];
  }
  return JSON.parse(data);
};

const saveStoredCompetitions = (comps: Competition[]) => {
  localStorage.setItem('testoriax_competitions', JSON.stringify(comps));
};

const getStoredRegistrations = (): any[] => {
  const data = localStorage.getItem('testoriax_comp_registrations');
  return data ? JSON.parse(data) : [];
};

const saveStoredRegistrations = (regs: any[]) => {
  localStorage.setItem('testoriax_comp_registrations', JSON.stringify(regs));
};

// Helper to dynamically attach test details for mock competitions or fallback storage
const attachTestDetails = async (comp: Competition): Promise<Competition> => {
  if (comp.test_id === 'java-mock-test') {
    comp.tests = { title: 'Java Programming Mock Test', duration: 60, total_marks: 150, questions: [1, 2, 3, 4, 5], registration_type: 'simple' };
  } else if (comp.test_id === 'test-1') {
    comp.tests = { title: 'Python Advanced OOP Design Patterns', duration: 45, total_marks: 75, questions: [1, 2, 3, 4], registration_type: 'simple' };
  } else {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('title, duration, total_marks, questions, registration_type, reg_fields, visibility')
        .eq('id', comp.test_id)
        .single();
      if (!error && data) {
        comp.tests = data;
        comp.visibility = data.visibility || 'public';
      } else {
        comp.tests = { title: 'Competition Assessment Test', duration: 60, total_marks: 100, questions: [], registration_type: 'simple' };
      }
    } catch {
      comp.tests = { title: 'Competition Assessment Test', duration: 60, total_marks: 100, questions: [], registration_type: 'simple' };
    }
  }
  return comp;
};

// Mapper: Supabase Database model to Frontend Competition model
function mapDbToCompetition(dbComp: any): Competition {
  if (!dbComp) return dbComp;
  return {
    id: dbComp.id,
    creator_id: dbComp.creator_id,
    test_id: dbComp.test_id,
    title: dbComp.competition_title,
    description: dbComp.competition_description || '',
    banner_image: dbComp.banner_theme || '',
    start_time: dbComp.start_datetime,
    end_time: dbComp.end_datetime,
    registration_deadline: dbComp.registration_deadline,
    max_participants: dbComp.max_participants,
    visibility: dbComp.tests?.visibility || 'public',
    status: dbComp.status,
    prize_details: dbComp.prize_details || '',
    rules: dbComp.competition_rules || '',
    organizer_contact: dbComp.organizer_contact || '',
    leaderboard_type: dbComp.leaderboard_visibility || 'live',
    winner_visibility: dbComp.winner_visibility || 'public',
    winners_announced: dbComp.winners_announced || false,
    created_at: dbComp.created_at,
    tests: dbComp.tests || null,
    creator_name: dbComp.profiles?.full_name || 'Educator'
  };
}

// Mapper: Frontend Competition model to Supabase Database model
function mapCompetitionToDb(comp: Omit<Competition, 'id' | 'created_at'> & { id?: string }): any {
  const dbComp: any = {
    creator_id: comp.creator_id,
    test_id: comp.test_id,
    competition_title: comp.title,
    competition_description: comp.description,
    banner_theme: comp.banner_image,
    start_datetime: comp.start_time,
    end_datetime: comp.end_time,
    registration_deadline: comp.registration_deadline,
    max_participants: comp.max_participants,
    prize_details: comp.prize_details,
    competition_rules: comp.rules,
    organizer_contact: comp.organizer_contact,
    leaderboard_visibility: comp.leaderboard_type,
    winner_visibility: comp.winner_visibility,
    status: comp.status,
    winners_announced: comp.winners_announced || false
  };
  if (comp.id) {
    dbComp.id = comp.id;
  }
  return dbComp;
}

export const competitionsService = {
  /**
   * Fetches all competitions, with standard filters
   */
  async getCompetitions() {
    if (isPlaceholderConfig) {
      const mockComps = getStoredCompetitions();
      const populatedComps = await Promise.all(mockComps.map(c => attachTestDetails(c)));
      // Filter cancelled out for participant view, ordered by start_time
      const filtered = populatedComps
        .filter(c => c.status !== 'cancelled')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      return { data: filtered, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          profiles:creator_id (
            full_name
          ),
          tests:test_id (
            title,
            duration,
            total_marks,
            questions,
            registration_type,
            reg_fields,
            visibility
          )
        `)
        .neq('status', 'cancelled')
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      const mapped = data.map(mapDbToCompetition);
      return { data: mapped, error: null };
    } catch (err: any) {
      console.warn('Supabase getCompetitions failed, falling back to mock storage:', err.message);
      const mockComps = getStoredCompetitions();
      const populatedComps = await Promise.all(mockComps.map(c => attachTestDetails(c)));
      const filtered = populatedComps
        .filter(c => c.status !== 'cancelled')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      return { data: filtered, error: null };
    }
  },

  /**
   * Fetches a single competition by ID
   */
  async getCompetitionById(id: string) {
    if (isPlaceholderConfig || id.startsWith('mock-comp-') || id.startsWith('comp-')) {
      const mockComps = getStoredCompetitions();
      const comp = mockComps.find(c => c.id === id);
      
      if (!comp) return { data: null, error: { message: 'Competition not found' } as any };
      
      const populatedComp = await attachTestDetails(comp);
      return { data: populatedComp, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          profiles:creator_id (
            full_name
          ),
          tests:test_id (
            title,
            duration,
            total_marks,
            questions,
            registration_type,
            reg_fields,
            visibility
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: mapDbToCompetition(data), error: null };
    } catch (err: any) {
      console.warn('Supabase getCompetitionById failed, checking mock storage:', err.message);
      const mockComps = getStoredCompetitions();
      const comp = mockComps.find(c => c.id === id);
      if (comp) {
        const populatedComp = await attachTestDetails(comp);
        return { data: populatedComp, error: null };
      }
      return { data: null, error: err };
    }
  },

  /**
   * Creates a new competition
   */
  async createCompetition(compData: Omit<Competition, 'id' | 'created_at'>) {
    const newId = 'comp-' + Math.random().toString(36).substring(2, 11);
    const newComp: Competition = {
      ...compData,
      id: newId,
      created_at: new Date().toISOString()
    };

    if (isPlaceholderConfig) {
      const mockComps = getStoredCompetitions();
      mockComps.unshift(newComp);
      saveStoredCompetitions(mockComps);
      return { data: newComp, error: null };
    }

    try {
      const dbCompData = mapCompetitionToDb(compData);
      const { data, error } = await supabase
        .from('competitions')
        .insert(dbCompData)
        .select()
        .single();

      if (error) throw error;
      return { data: mapDbToCompetition(data), error: null };
    } catch (err: any) {
      console.warn('Supabase createCompetition failed, saving to mock storage:', err.message);
      const mockComps = getStoredCompetitions();
      mockComps.unshift(newComp);
      saveStoredCompetitions(mockComps);
      return { data: newComp, error: null };
    }
  },

  /**
   * Updates an existing competition
   */
  async updateCompetition(id: string, updates: Partial<Competition>) {
    if (isPlaceholderConfig || id.startsWith('mock-comp-') || id.startsWith('comp-')) {
      const mockComps = getStoredCompetitions();
      const idx = mockComps.findIndex(c => c.id === id);
      if (idx !== -1) {
        mockComps[idx] = { ...mockComps[idx], ...updates };
        saveStoredCompetitions(mockComps);
        return { data: mockComps[idx], error: null };
      }
      return { data: null, error: { message: 'Competition not found in mock storage' } as any };
    }

    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.competition_title = updates.title;
      if (updates.description !== undefined) dbUpdates.competition_description = updates.description;
      if (updates.banner_image !== undefined) dbUpdates.banner_theme = updates.banner_image;
      if (updates.start_time !== undefined) dbUpdates.start_datetime = updates.start_time;
      if (updates.end_time !== undefined) dbUpdates.end_datetime = updates.end_time;
      if (updates.registration_deadline !== undefined) dbUpdates.registration_deadline = updates.registration_deadline;
      if (updates.max_participants !== undefined) dbUpdates.max_participants = updates.max_participants;
      if (updates.prize_details !== undefined) dbUpdates.prize_details = updates.prize_details;
      if (updates.rules !== undefined) dbUpdates.competition_rules = updates.rules;
      if (updates.organizer_contact !== undefined) dbUpdates.organizer_contact = updates.organizer_contact;
      if (updates.leaderboard_type !== undefined) dbUpdates.leaderboard_visibility = updates.leaderboard_type;
      if (updates.winner_visibility !== undefined) dbUpdates.winner_visibility = updates.winner_visibility;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.winners_announced !== undefined) dbUpdates.winners_announced = updates.winners_announced;

      const { data, error } = await supabase
        .from('competitions')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: mapDbToCompetition(data), error: null };
    } catch (err: any) {
      console.warn('Supabase updateCompetition failed, updating mock storage:', err.message);
      const mockComps = getStoredCompetitions();
      const idx = mockComps.findIndex(c => c.id === id);
      if (idx !== -1) {
        mockComps[idx] = { ...mockComps[idx], ...updates };
        saveStoredCompetitions(mockComps);
        return { data: mockComps[idx], error: null };
      }
      return { data: null, error: err };
    }
  },

  /**
   * Registers a user for a competition
   */
  async registerForCompetition(compId: string, testId: string, userId: string, regData: any) {
    const newReg = {
      id: 'reg-' + Math.random().toString(36).substring(2, 11),
      competition_id: compId,
      test_id: testId,
      user_id: userId,
      registration_data: regData,
      registered_at: new Date().toISOString()
    };

    if (isPlaceholderConfig || compId.startsWith('mock-comp-') || compId.startsWith('comp-')) {
      const mockRegs = getStoredRegistrations();
      // Remove any existing registration for this user + competition to prevent duplicates
      const filtered = mockRegs.filter(r => !(r.competition_id === compId && r.user_id === userId));
      filtered.push(newReg);
      saveStoredRegistrations(filtered);
      return { data: newReg, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('test_registrations')
        .insert({
          competition_id: compId,
          test_id: testId,
          user_id: userId,
          registration_data: regData
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('You are already registered for this competition.');
        }
        throw error;
      }
      
      return { data, error: null };
    } catch (err: any) {
      if (err.message === 'You are already registered for this competition.') {
        throw err; // re-throw user-facing error
      }
      console.warn('Supabase registerForCompetition failed, saving to mock storage:', err.message);
      const mockRegs = getStoredRegistrations();
      const filtered = mockRegs.filter(r => !(r.competition_id === compId && r.user_id === userId));
      filtered.push(newReg);
      saveStoredRegistrations(filtered);
      return { data: newReg, error: null };
    }
  },

  /**
   * Gets registration status for a specific user and competition
   */
  async getRegistrationStatus(compId: string, userId: string) {
    if (isPlaceholderConfig || compId.startsWith('mock-comp-') || compId.startsWith('comp-')) {
      const mockRegs = getStoredRegistrations();
      const reg = mockRegs.find(r => r.competition_id === compId && r.user_id === userId);
      return { data: reg || null, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('test_registrations')
        .select('*')
        .eq('competition_id', compId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return { data: data || null, error: null };
    } catch (err: any) {
      console.warn('Supabase getRegistrationStatus failed, checking mock storage:', err.message);
      const mockRegs = getStoredRegistrations();
      const reg = mockRegs.find(r => r.competition_id === compId && r.user_id === userId);
      return { data: reg || null, error: null };
    }
  },

  /**
   * Fetches all registered users for a competition
   */
  async getCompetitionRegistrations(compId: string) {
    if (isPlaceholderConfig || compId.startsWith('mock-comp-') || compId.startsWith('comp-')) {
      const mockRegs = getStoredRegistrations().filter(r => r.competition_id === compId);
      // Map to simulate profile details join
      const mapped = mockRegs.map(r => ({
        ...r,
        profiles: {
          full_name: r.registration_data?.full_name || 'Anonymous Competitor',
          email: r.registration_data?.email || 'N/A'
        }
      }));
      return { data: mapped, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('test_registrations')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('competition_id', compId);

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.warn('Supabase getCompetitionRegistrations failed, returning mock storage:', err.message);
      const mockRegs = getStoredRegistrations().filter(r => r.competition_id === compId);
      const mapped = mockRegs.map(r => ({
        ...r,
        profiles: {
          full_name: r.registration_data?.full_name || 'Anonymous Competitor',
          email: r.registration_data?.email || 'N/A'
        }
      }));
      return { data: mapped, error: null };
    }
  },

  /**
   * Fetches all registrations for a specific user
   */
  async getUserRegistrations(userId: string) {
    if (isPlaceholderConfig) {
      const mockRegs = getStoredRegistrations().filter(r => r.user_id === userId);
      return { data: mockRegs, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('test_registrations')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.warn('Supabase getUserRegistrations failed, checking mock storage:', err.message);
      const mockRegs = getStoredRegistrations().filter(r => r.user_id === userId);
      return { data: mockRegs, error: null };
    }
  },

  /**
   * Fetches attempts (results) for a competition to populate the leaderboard
   */
  async getCompetitionLeaderboard(compId: string, _testId: string) {
    if (isPlaceholderConfig || compId.startsWith('mock-comp-') || compId.startsWith('comp-')) {
      // Return mock leaderboard results
      const mockResults = [
        {
          id: 'att-1',
          score: 145,
          total_marks: 150,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          submitted_at: new Date(Date.now() - 3600000 + 1800000).toISOString(), // 30 mins taken
          status: 'submitted',
          profiles: {
            full_name: 'Mahak Gupta',
            email: 'mahak@testoriax.io'
          }
        },
        {
          id: 'att-2',
          score: 135,
          total_marks: 150,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          submitted_at: new Date(Date.now() - 3600000 + 2100000).toISOString(), // 35 mins taken
          status: 'submitted',
          profiles: {
            full_name: 'Dr. Aris Thorne',
            email: 'aris@testoriax.io'
          }
        },
        {
          id: 'att-3',
          score: 120,
          total_marks: 150,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          submitted_at: new Date(Date.now() - 3600000 + 2400000).toISOString(), // 40 mins taken
          status: 'submitted',
          profiles: {
            full_name: 'Alice Cooper',
            email: 'alice@testoriax.io'
          }
        }
      ];
      return { data: mockResults, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('attempts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('competition_id', compId)
        .eq('status', 'submitted')
        .order('score', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.warn('Supabase getCompetitionLeaderboard failed, returning mock data:', err.message);
      return {
        data: [
          {
            id: 'att-1',
            score: 92,
            total_marks: 100,
            started_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            status: 'submitted',
            profiles: { full_name: 'Candidate A', email: 'a@example.com' }
          }
        ],
        error: null
      };
    }
  }
};

export default competitionsService;
