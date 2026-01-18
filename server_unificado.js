const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { supabase } = require('./database_supabase');

const categories = ['senior', 'master', 'ejecutivo'];
const mainApp = express();
const PORT = process.env.PORT || 3000;

mainApp.use(cors());
mainApp.use(bodyParser.json());
mainApp.use(express.static('.'));

categories.forEach(cat => {
    const catPath = path.join(__dirname, cat);
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    app.use(express.static(catPath));

    // --- API ENDPOINTS USANDO SUPABASE ---

    app.get('/api/teams', async (req, res) => {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('category', cat);
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.post('/api/teams', async (req, res) => {
        const { name, logo } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });
        const { data, error } = await supabase
            .from('teams')
            .insert([{ name, logo, category: cat }])
            .select();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
    });

    app.get('/api/teams/:id/players', async (req, res) => {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('team_id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.post('/api/teams/:id/players', async (req, res) => {
        const { name, cedula, dob, type, jerseyNumber } = req.body;
        const { data, error } = await supabase
            .from('players')
            .insert([{
                name,
                team_id: req.params.id,
                cedula,
                dob,
                type,
                jersey_number: jerseyNumber
            }])
            .select();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
    });

    app.get('/api/players/all', async (req, res) => {
        // En Supabase/Postgres hacemos el join
        const { data, error } = await supabase
            .from('players')
            .select('*, teams(name)')
            .filter('teams.category', 'eq', cat);

        if (error) return res.status(500).json({ error: error.message });

        // Formatear para que el frontend lo entienda
        const formatted = data.filter(p => p.teams).map(p => ({
            ...p,
            team_name: p.teams.name
        }));
        res.json(formatted);
    });

    app.patch('/api/players/:id/status', async (req, res) => {
        const { field, value } = req.body;
        const updateData = {};
        updateData[field] = value ? 1 : 0;
        const { error } = await supabase
            .from('players')
            .update(updateData)
            .eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: "Updated" });
    });

    app.get('/api/matches', async (req, res) => {
        const { data, error } = await supabase
            .from('matches')
            .select('*, t1:teams!team_a_id(name), t2:teams!team_b_id(name)')
            .eq('category', cat);

        if (error) return res.status(500).json({ error: error.message });

        const parsed = data.map(r => ({
            ...r,
            equipoA: r.t1.name,
            equipoB: r.t2.name,
            scorersA: r.scorers_a || [],
            scorersB: r.scorers_b || [],
            yellowsA: r.yellows_a || [],
            yellowsB: r.yellows_b || [],
            redsA: r.reds_a || [],
            redsB: r.reds_b || []
        }));
        res.json(parsed);
    });

    app.post('/api/matches', async (req, res) => {
        const { equipoA, equipoB, fecha, scoreA, scoreB, scorersA, scorersB, yellowsA, yellowsB, redsA, redsB, matchDay } = req.body;
        const { data, error } = await supabase
            .from('matches')
            .insert([{
                team_a_id: equipoA,
                team_b_id: equipoB,
                date: fecha,
                score_a: scoreA,
                score_b: scoreB,
                scorers_a: scorersA,
                scorers_b: scorersB,
                yellows_a: yellowsA,
                yellows_b: yellowsB,
                reds_a: redsA,
                reds_b: redsB,
                match_day: matchDay,
                category: cat
            }])
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.json({ id: data[0].id });
    });

    app.delete('/api/matches/:id', async (req, res) => {
        const { error } = await supabase.from('matches').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: "Deleted" });
    });

    app.delete('/api/players/:id', async (req, res) => {
        const { error } = await supabase.from('players').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: "Deleted" });
    });

    app.delete('/api/teams/:id', async (req, res) => {
        // Supabase maneja ON DELETE CASCADE si se configura, si no, lo hacemos manual
        await supabase.from('players').delete().eq('team_id', req.params.id);
        const { error } = await supabase.from('teams').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: "Deleted" });
    });

    app.get('/api/settings', async (req, res) => {
        const { data, error } = await supabase
            .from('settings')
            .select('league_name')
            .eq('category', cat)
            .single();

        if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
        res.json({ league_name: data ? data.league_name : `AFEMEC - ${cat.toUpperCase()}`, port: PORT });
    });

    app.post('/api/settings', async (req, res) => {
        const { league_name } = req.body;
        const { error } = await supabase
            .from('settings')
            .upsert({ category: cat, league_name: league_name }, { onConflict: 'category' });
        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: "Updated" });
    });

    mainApp.use(`/${cat}`, app);
});

mainApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

mainApp.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Multi-Torneo con Supabase iniciado en puerto ${PORT}`);
});
