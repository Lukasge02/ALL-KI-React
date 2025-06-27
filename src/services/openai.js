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
            const systemPrompt = `Du bist ein Profil-Interview-Assistent von ALL-KI. 
Du führst ein strukturiertes Interview durch, um personalisierte Nutzerprofile zu erstellen.

Ziel: Sammle Informationen über den Nutzer für das angegebene Profil.
- Stelle jeweils nur EINE konkrete Frage
- Baue auf vorherigen Antworten auf
- Sammle Informationen über Ziele, Vorlieben, Herausforderungen
- Sei freundlich und gesprächig
- Nach 4-5 Fragen sage: "Vielen Dank! Ich habe genug Informationen gesammelt."

Aktueller Profil-Status: ${Object.keys(profileData).length > 0 ? JSON.stringify(profileData) : 'Neues Profil'}`;

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

    async extractProfileData(conversationHistory) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            const systemPrompt = `Analysiere das folgende Interview und extrahiere strukturierte Profildaten.
Erstelle ein JSON-Objekt mit den wichtigsten Informationen über den Nutzer.

Format:
{
  "name": "Profilname",
  "category": "Kategorie (z.B. Arbeit, Sport, Kochen)",
  "goals": ["Ziel1", "Ziel2"],
  "preferences": ["Vorliebe1", "Vorliebe2"],
  "challenges": ["Herausforderung1", "Herausforderung2"],
  "frequency": "Wie oft beschäftigt sich der Nutzer damit",
  "experience": "Erfahrungslevel",
  "notes": "Zusätzliche wichtige Notizen"
}

Antworte nur mit dem JSON-Objekt, keine zusätzlichen Erklärungen.`;

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
            return JSON.parse(response);
        } catch (error) {
            console.error('OpenAI Extract Profile Data Error:', error);
            throw new Error('Profildaten konnten nicht extrahiert werden');
        }
    }

    async contextualChat(message, profileData = {}, conversationHistory = []) {
        if (!this.client) {
            throw new Error('OpenAI API nicht konfiguriert');
        }

        try {
            let systemPrompt = `Du bist ALL-KI, ein personalisierter Assistent für den Nutzer.`;
            
            if (Object.keys(profileData).length > 0) {
                systemPrompt += `\n\nKontext über den Nutzer:
Profil: ${profileData.name || 'Unbekannt'}
Kategorie: ${profileData.category || 'Allgemein'}
Ziele: ${profileData.goals ? profileData.goals.join(', ') : 'Keine angegeben'}
Vorlieben: ${profileData.preferences ? profileData.preferences.join(', ') : 'Keine angegeben'}
Erfahrung: ${profileData.experience || 'Unbekannt'}

Nutze diese Informationen, um personalisierte und relevante Antworten zu geben.`;
            }

            systemPrompt += `\n\nAntworte freundlich, hilfreich und auf Deutsch. Halte deine Antworten präzise aber informativ.`;

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