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

    async profileInterview(message, conversationHistory = [], profileData = {}) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            // ✅ DYNAMISCHES INTERVIEW basierend auf User-Input
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
- Nach 4-5 relevanten Fragen sage: "Vielen Dank! Ich habe genug Informationen für dein personalisiertes '${this.getProfileNameFromHistory(conversationHistory)}' Profil gesammelt."
- Stelle nur EINE Frage pro Antwort
- Sei enthusiastisch und unterstützend

Bisherige Gespräch: ${conversationHistory.length > 0 ? 'Hat bereits begonnen' : 'Erstes Interview'}
Profil-Context: ${Object.keys(profileData).length > 0 ? JSON.stringify(profileData) : 'Neues Profil wird erstellt'}`;

            // Build conversation history
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
                max_tokens: 300,
                temperature: 0.8,
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI Profile Interview Error:', error);
            throw new Error('Interview-Antwort konnte nicht generiert werden');
        }
    }

    // ✅ Helper function to extract profile name from first user message
    getProfileNameFromHistory(conversationHistory) {
        if (conversationHistory.length > 0) {
            const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
            return firstUserMessage ? firstUserMessage.content : 'Profil';
        }
        return 'Profil';
    }

    async extractProfileData(conversationHistory) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            // ✅ VERBESSERTER PROMPT für freie Kategorien
            const systemPrompt = `Analysiere das folgende Interview und extrahiere strukturierte Profildaten.

WICHTIG für "name" und "category":
- Der "name" soll dem ursprünglichen User-Input sehr ähnlich sein (nur Rechtschreibung/Großschreibung korrigieren)
- Die "category" soll eine bereinigte, kurze Version des Namens sein
- Beispiele:
  - User sagt "sport" → name: "Sport", category: "Sport" 
  - User sagt "kochen lernen" → name: "Kochen Lernen", category: "Kochen"
  - User sagt "arbeit projekkte" → name: "Arbeit Projekte", category: "Arbeit"
  - User sagt "fitness training" → name: "Fitness Training", category: "Fitness"

EXTRAHIERE aus dem Gespräch:
- goals: Konkrete Ziele die erwähnt wurden
- preferences: Was der User mag, bevorzugt oder gerne macht
- challenges: Schwierigkeiten oder Herausforderungen
- frequency: Wie oft sich der User damit beschäftigt
- experience: Erfahrungslevel (Anfänger/Fortgeschritten/Experte)
- notes: Wichtige Zusatzinfos oder Kontext

FORMAT (EXAKT so ausgeben):
{
  "name": "Exakt wie User wollte (nur saubere Rechtschreibung)",
  "category": "Kurze bereinigte Kategorie", 
  "goals": ["Konkrete Ziele aus dem Gespräch"],
  "preferences": ["Was der User mag/bevorzugt"],
  "challenges": ["Herausforderungen die erwähnt wurden"],
  "frequency": "Wie oft beschäftigt sich der User damit",
  "experience": "Anfänger/Fortgeschritten/Experte",
  "notes": "Wichtige Zusatzinfos aus dem Gespräch"
}

Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Erklärungen oder Markdown.`;

            const conversationText = conversationHistory
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const completion = await this.client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: conversationText
                    }
                ],
                max_tokens: 400,
                temperature: 0.3,
            });

            const response = completion.choices[0].message.content.trim();
            console.log('🔹 Raw OpenAI response:', response);
            
            // ✅ ROBUSTES JSON PARSING
            let parsedData;
            try {
                // Remove potential markdown formatting
                const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                parsedData = JSON.parse(cleanResponse);
            } catch (parseError) {
                console.error('🔹 JSON parse error:', parseError);
                console.error('🔹 Response was:', response);
                
                // ✅ INTELLIGENTER FALLBACK basierend auf ersten User-Input
                const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
                const userInput = firstUserMessage ? firstUserMessage.content : 'Profil';
                
                parsedData = {
                    name: this.cleanProfileName(userInput),
                    category: this.extractCategory(userInput),
                    goals: this.extractGoalsFromConversation(conversationHistory),
                    preferences: this.extractPreferencesFromConversation(conversationHistory),
                    challenges: this.extractChallengesFromConversation(conversationHistory),
                    frequency: "Regelmäßig",
                    experience: "Anfänger",
                    notes: "Profil basierend auf Gesprächsanalyse erstellt"
                };
            }
            
            // ✅ VALIDIERUNG und BEREINIGUNG
            parsedData.name = parsedData.name || 'Neues Profil';
            parsedData.category = parsedData.category || parsedData.name;
            parsedData.goals = Array.isArray(parsedData.goals) ? parsedData.goals : [];
            parsedData.preferences = Array.isArray(parsedData.preferences) ? parsedData.preferences : [];
            parsedData.challenges = Array.isArray(parsedData.challenges) ? parsedData.challenges : [];
            
            console.log('🔹 Final extracted profile data:', parsedData);
            return parsedData;
            
        } catch (error) {
            console.error('OpenAI Extract Profile Data Error:', error);
            throw new Error('Profildaten konnten nicht extrahiert werden');
        }
    }

    // ✅ HELPER METHODS für intelligente Extraktion
    cleanProfileName(input) {
        // Erste Buchstaben groß, Rest klein, Rechtschreibung bereinigen
        return input.trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    extractCategory(input) {
        const cleaned = this.cleanProfileName(input);
        // Nehme erstes Wort oder max 20 Zeichen
        return cleaned.split(' ')[0].substring(0, 20);
    }

    extractGoalsFromConversation(history) {
        const goals = [];
        const goalKeywords = ['ziel', 'erreichen', 'schaffen', 'möchte', 'will', 'goal'];
        
        history.forEach(msg => {
            if (msg.role === 'user') {
                const lower = msg.content.toLowerCase();
                if (goalKeywords.some(keyword => lower.includes(keyword))) {
                    goals.push(msg.content.substring(0, 100));
                }
            }
        });
        
        return goals.slice(0, 3); // Max 3 goals
    }

    extractPreferencesFromConversation(history) {
        const preferences = [];
        const prefKeywords = ['mag', 'liebe', 'bevorzuge', 'gerne', 'am liebsten'];
        
        history.forEach(msg => {
            if (msg.role === 'user') {
                const lower = msg.content.toLowerCase();
                if (prefKeywords.some(keyword => lower.includes(keyword))) {
                    preferences.push(msg.content.substring(0, 100));
                }
            }
        });
        
        return preferences.slice(0, 3);
    }

    extractChallengesFromConversation(history) {
        const challenges = [];
        const challengeKeywords = ['schwierig', 'problem', 'herausforderung', 'schwer', 'struggle'];
        
        history.forEach(msg => {
            if (msg.role === 'user') {
                const lower = msg.content.toLowerCase();
                if (challengeKeywords.some(keyword => lower.includes(keyword))) {
                    challenges.push(msg.content.substring(0, 100));
                }
            }
        });
        
        return challenges.slice(0, 3);
    }

    async contextualChat(message, profileData = {}, conversationHistory = []) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            // ✅ VERBESSERTER KONTEXT basierend auf dynamischen Profilen
            let systemPrompt = `Du bist ALL-KI, ein personalisierter Assistent für den Nutzer.`;
            
            if (Object.keys(profileData).length > 0) {
                systemPrompt += `\n\nKontext über den Nutzer:
Profil: ${profileData.name || 'Unbekannt'} (Kategorie: ${profileData.category || 'Allgemein'})
Ziele: ${profileData.goals && profileData.goals.length > 0 ? profileData.goals.join(', ') : 'Keine spezifischen Ziele erwähnt'}
Vorlieben: ${profileData.preferences && profileData.preferences.length > 0 ? profileData.preferences.join(', ') : 'Keine spezifischen Vorlieben erwähnt'}
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
}

module.exports = new OpenAIService();