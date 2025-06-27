const OpenAI = require('openai');

class OpenAIService {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OPENAI_API_KEY nicht gefunden. KI-Features funktionieren nicht.');
            this.client = null;
            return;
        }

        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        console.log('✅ OpenAI Service initialisiert');
    }

    // Quick chat for general questions
    async quickChat(message, userContext = {}) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            const systemPrompt = `Du bist ALL-KI, ein smarter und hilfsbereiter Alltagsassistent. 
Du hilfst Benutzern bei verschiedenen Aufgaben und beantwortest Fragen freundlich und präzise.
Antworte auf Deutsch und halte deine Antworten informativ aber nicht zu lang.
${userContext.name ? `Der Benutzer heißt ${userContext.name}.` : ''}`;

            const completion = await this.client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI Quick Chat Error:', error);
            throw new Error('KI-Antwort konnte nicht generiert werden');
        }
    }

    // Profile interview assistant
    async profileInterview(message, conversationHistory = [], profileData = {}) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            const systemPrompt = `Du bist ein intelligenter Profil-Interview-Assistent von ALL-KI.

ZIEL: Sammle Informationen für ein personalisiertes KI-Profil basierend auf dem User-Input.

VERHALTEN:
1. ERSTE ANTWORT: Bestätige den Profilnamen (EXAKT wie User eingegeben, nur Rechtschreibung korrigieren) und stelle eine spezifische Frage
2. FOLGENDE FRAGEN: Baue intelligent auf vorherigen Antworten auf
3. ERKENNE AUTOMATISCH: Ziele, Vorlieben, Herausforderungen, Erfahrungslevel, Häufigkeit
4. ADAPTIERE FRAGEN: Je nach Thema - sei spezifisch!

BEISPIEL-FLOWS:
User: "Sport" 
→ "Perfekt! Ich erstelle ein 'Sport' Profil für dich. Welche Sportart machst du am liebsten?"

User: "Kochen lernen"
→ "Super! Ich erstelle ein 'Kochen Lernen' Profil. Welche Art von Küche interessiert dich am meisten?"

User: "Arbeit projekte" 
→ "Toll! Ich erstelle ein 'Arbeit Projekte' Profil. In welchem Bereich arbeitest du?"

WICHTIG:
- Halte Fragen kurz, spezifisch und motivierend
- Nach 4-5 relevanten Fragen sage: "Vielen Dank! Ich habe genug Informationen für dein personalisiertes Profil."
- Erkenne automatisch, wenn User fertig ist oder abbrechen will
- Sei enthusiastisch und unterstützend

AKTUELLE INFORMATIONEN:
${Object.keys(profileData).length > 0 ? `Bereits gesammelt: ${JSON.stringify(profileData)}` : 'Noch keine Daten gesammelt'}`;

            // Build messages array with conversation history
            const messages = [
                {
                    role: "system",
                    content: systemPrompt
                }
            ];

            // Add conversation history
            conversationHistory.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });

            // Add current message
            messages.push({
                role: "user",
                content: message
            });

            const completion = await this.client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 400,
                temperature: 0.8,
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI Profile Interview Error:', error);
            throw new Error('Interview-Antwort konnte nicht generiert werden');
        }
    }

    // Extract profile data from conversation history
    async extractProfileData(conversationHistory) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            // Prepare conversation text
            const conversationText = conversationHistory
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const systemPrompt = `Du bist ein Profil-Analyse-Experte. Analysiere die folgende Unterhaltung und extrahiere strukturierte Profildaten.

AUFGABE: Analysiere die Unterhaltung und erstelle ein JSON-Objekt mit folgender Struktur:

{
    "name": "Profilname (aus erstem User-Input, korrigiere nur Rechtschreibung)",
    "category": "passende Kategorie aus: sport, kochen, arbeit, lernen, gesundheit, hobby, familie, finanzen, technologie, kreativ, reisen, general",
    "goals": ["Ziel 1", "Ziel 2", ...],
    "preferences": ["Vorliebe 1", "Vorliebe 2", ...],
    "challenges": ["Herausforderung 1", "Herausforderung 2", ...],
    "experience": "anfaenger|fortgeschritten|experte",
    "frequency": "taeglich|woechentlich|monatlich|selten",
    "notes": "Zusätzliche wichtige Informationen als Fließtext"
}

REGELN:
- Wenn Informationen fehlen, verwende sinnvolle Standard-Werte
- Der "name" sollte EXAKT dem ersten User-Input entsprechen (nur Rechtschreibung korrigieren)
- Alle Arrays sollten mindestens ein Element haben
- "notes" sollte eine prägnante Zusammenfassung sein
- Antworte NUR mit dem JSON-Objekt, kein anderer Text

UNTERHALTUNG:
${conversationText}`;

            const completion = await this.client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    }
                ],
                max_tokens: 600,
                temperature: 0.3, // Lower temperature for more consistent JSON output
            });

            const response = completion.choices[0].message.content.trim();
            
            // Try to parse the JSON response
            try {
                const profileData = JSON.parse(response);
                
                // Validate and sanitize the data
                return this.validateProfileData(profileData);
            } catch (jsonError) {
                console.error('JSON Parse Error:', jsonError);
                console.log('Raw response:', response);
                
                // Return fallback data if JSON parsing fails
                return this.createFallbackProfileData(conversationHistory);
            }

        } catch (error) {
            console.error('OpenAI Extract Profile Data Error:', error);
            // Return fallback data on any error
            return this.createFallbackProfileData(conversationHistory);
        }
    }

    // Validate and sanitize extracted profile data
    validateProfileData(data) {
        const validCategories = [
            'sport', 'kochen', 'arbeit', 'lernen', 'gesundheit', 'hobby', 
            'familie', 'finanzen', 'technologie', 'kreativ', 'reisen', 'general'
        ];
        
        const validExperience = ['anfaenger', 'fortgeschritten', 'experte'];
        const validFrequency = ['taeglich', 'woechentlich', 'monatlich', 'selten'];

        return {
            name: (data.name || 'Neues Profil').substring(0, 100),
            category: validCategories.includes(data.category) ? data.category : 'general',
            goals: Array.isArray(data.goals) && data.goals.length > 0 ? data.goals.slice(0, 5) : ['Unterstützung erhalten'],
            preferences: Array.isArray(data.preferences) && data.preferences.length > 0 ? data.preferences.slice(0, 5) : ['Personalisierte Hilfe'],
            challenges: Array.isArray(data.challenges) ? data.challenges.slice(0, 5) : [],
            experience: validExperience.includes(data.experience) ? data.experience : 'anfaenger',
            frequency: validFrequency.includes(data.frequency) ? data.frequency : 'woechentlich',
            notes: (data.notes || '').substring(0, 1000)
        };
    }

    // Create fallback profile data when extraction fails
    createFallbackProfileData(conversationHistory) {
        // Try to extract at least the profile name from the first user message
        const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
        const profileName = firstUserMessage ? firstUserMessage.content.substring(0, 50) : 'Neues Profil';

        return {
            name: profileName,
            category: 'general',
            goals: ['Unterstützung erhalten'],
            preferences: ['Personalisierte Hilfe'],
            challenges: [],
            experience: 'anfaenger',
            frequency: 'woechentlich',
            notes: 'Automatisch erstelltes Profil'
        };
    }

    // Contextual chat using profile data
    async contextualChat(message, profileData, conversationHistory = []) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            // Build system prompt with profile context
            let systemPrompt = `Du bist ein spezialisierter KI-Assistent für das Profil "${profileData.name || 'Unbekannt'}".

PROFIL-KONTEXT:
Kategorie: ${profileData.category || 'Allgemein'}`;

            // Add detailed profile information if available
            if (profileData.goals && profileData.goals.length > 0) {
                systemPrompt += `
Ziele: ${profileData.goals.join(', ')}
Vorlieben: ${profileData.preferences ? profileData.preferences.join(', ') : 'Keine spezifischen Vorlieben erwähnt'}
Herausforderungen: ${profileData.challenges && profileData.challenges.length > 0 ? profileData.challenges.join(', ') : 'Keine spezifischen Herausforderungen erwähnt'}
Erfahrung: ${profileData.experience || 'Unbekannt'}
Häufigkeit: ${profileData.frequency || 'Unbekannt'}
Zusatzinfos: ${profileData.notes || 'Keine zusätzlichen Informationen'}

Nutze diese Informationen, um personalisierte, relevante und hilfreiche Antworten zu geben. 
Baue auf den Zielen und Vorlieben auf und hilf bei den Herausforderungen.`;
            }

            systemPrompt += `\n\nAntworte freundlich, hilfreich und auf Deutsch. 
Halte deine Antworten präzise aber informativ. 
Stelle gelegentlich Rückfragen um das Profil noch besser zu verstehen.`;

            // Build messages array
            const messages = [
                {
                    role: "system",
                    content: systemPrompt
                }
            ];

            // Add recent conversation history (last 10 messages to stay within limits)
            const recentHistory = conversationHistory.slice(-10);
            recentHistory.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });

            // Add current message
            messages.push({
                role: "user",
                content: message
            });

            const completion = await this.client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 600,
                temperature: 0.7,
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI Contextual Chat Error:', error);
            throw new Error('Kontextuelle Antwort konnte nicht generiert werden');
        }
    }

    // Generate smart suggestions based on profile
    async generateSuggestions(profileData, context = 'general') {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            const systemPrompt = `Du bist ein intelligenter Vorschlag-Generator für das ALL-KI System.

AUFGABE: Generiere 3-5 personalisierte, actionable Vorschläge für den User basierend auf seinem Profil.

PROFIL:
- Name: ${profileData.name}
- Kategorie: ${profileData.category}
- Ziele: ${profileData.goals?.join(', ') || 'Keine'}
- Erfahrung: ${profileData.experience || 'Unbekannt'}
- Häufigkeit: ${profileData.frequency || 'Unbekannt'}

KONTEXT: ${context}

FORMAT: Antworte mit einem JSON Array von Objekten:
[
    {
        "title": "Kurzer Titel",
        "description": "Detaillierte Beschreibung",
        "action": "Konkrete Handlungsaufforderung",
        "priority": "high|medium|low"
    }
]

Die Vorschläge sollen:
- Spezifisch für die Kategorie sein
- Auf die Ziele eingehen
- Dem Erfahrungslevel entsprechen
- Praktisch umsetzbar sein`;

            const completion = await this.client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.8,
            });

            const response = completion.choices[0].message.content.trim();
            
            try {
                return JSON.parse(response);
            } catch (jsonError) {
                console.error('Suggestions JSON Parse Error:', jsonError);
                return this.getFallbackSuggestions(profileData);
            }

        } catch (error) {
            console.error('OpenAI Generate Suggestions Error:', error);
            return this.getFallbackSuggestions(profileData);
        }
    }

    // Fallback suggestions when AI generation fails
    getFallbackSuggestions(profileData) {
        const category = profileData.category || 'general';
        
        const fallbackSuggestions = {
            sport: [
                {
                    title: "Trainingsplan erstellen",
                    description: "Erstelle einen personalisierten Trainingsplan basierend auf deinen Zielen",
                    action: "Erzähle mir von deinen Fitnesszielen",
                    priority: "high"
                }
            ],
            kochen: [
                {
                    title: "Neues Rezept ausprobieren",
                    description: "Entdecke ein Rezept, das zu deinen Vorlieben passt",
                    action: "Sage mir, was du gerne isst",
                    priority: "medium"
                }
            ],
            general: [
                {
                    title: "Profil vervollständigen",
                    description: "Teile mehr Informationen, um bessere Empfehlungen zu erhalten",
                    action: "Erzähle mir mehr über deine Ziele",
                    priority: "medium"
                }
            ]
        };

        return fallbackSuggestions[category] || fallbackSuggestions.general;
    }

    // Health check method
    async testConnection() {
        if (!this.client) {
            return { success: false, error: 'API Key nicht konfiguriert' };
        }

        try {
            const completion = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: "Hallo! Antworte nur mit 'Test erfolgreich!'"
                    }
                ],
                max_tokens: 50,
                temperature: 0,
            });

            return { 
                success: true, 
                response: completion.choices[0].message.content.trim() 
            };
        } catch (error) {
            console.error('OpenAI Connection Test Error:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // Get AI service status
    getStatus() {
        return {
            configured: !!this.client,
            apiKeyPresent: !!process.env.OPENAI_API_KEY,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new OpenAIService();