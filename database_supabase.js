const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rkodqjafhssciaurympn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrb2RxamFmaHNzY2lhdXJ5bXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDM5NjYsImV4cCI6MjA4NDI3OTk2Nn0.Bgdp8_Lx2PPiWCs4JtGPPJun0dI5hl8pmnEwAwZF2yM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function initDb(category) {
    console.log(`Iniciando base de datos para categoría: ${category}`);

    // Crear tablas si no existen (Supabase/PostgreSQL)
    // Nota: En Supabase las tablas se suelen crear desde el dashboard, 
    // pero aquí intentaremos asegurar la estructura básica.

    // Tabla Settings
    const { error: settingsError } = await supabase.from('settings').select('count', { count: 'exact', head: true }).eq('category', category);
    if (settingsError && settingsError.code === 'PGRST116') {
        // La tabla no existe o está vacía, esto es solo un recordatorio de que debemos crearla en el dashboard
        console.warn('Recuerda crear las tablas en el dashboard de Supabase.');
    }
}

module.exports = { supabase, initDb };
