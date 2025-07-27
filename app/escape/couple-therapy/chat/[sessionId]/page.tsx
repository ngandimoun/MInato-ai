'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Send, User, Users, MessageCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatSessionStatus, getStatusColor } from '@/lib/utils/couple-therapy';

interface Message {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  message_type: 'user' | 'partner' | 'ai_therapist';
  content_type: 'text' | 'audio' | 'therapeutic_intervention';
  created_at: string;
  is_visible_to_partner: boolean;
  metadata?: {
    therapeutic_technique?: string;
    emotion_detected?: string;
    intervention_type?: string;
    follow_up_questions?: string[];
  };
}

interface Session {
  id: string;
  title: string;
  status: string;
  creator_id: string;
  partner_id: string;
  language: string;
  started_at: string;
  ai_personality: string;
  therapy_approach: string;
  settings: {
    voice_enabled: boolean;
    auto_save: boolean;
    background_sounds: boolean;
    session_reminders: boolean;
    partner_notifications: boolean;
  };
}

// AI Therapeutic Response System
class CoupleTherapyAI {
  private sessionContext: string[] = [];
  private emotionalState: { [userId: string]: string } = {};
  private conversationPatterns: string[] = [];
  private language: string = 'en';

  constructor(language: string = 'en') {
    this.language = language;
  }

  // Analyze message for emotional content and therapeutic needs
  analyzeMessage(message: string, messageType: 'user' | 'partner' | 'ai_therapist'): {
    emotions: string[];
    needs: string[];
    therapeuticIntervention: string;
    followUpQuestions: string[];
  } {
    const emotions = this.detectEmotions(message);
    const needs = this.identifyNeeds(message);
    const intervention = this.determineIntervention(emotions, needs, messageType);
    const followUp = this.generateFollowUpQuestions(emotions, needs, messageType);

    return {
      emotions,
      needs,
      therapeuticIntervention: intervention,
      followUpQuestions: followUp
    };
  }

  private detectEmotions(message: string): string[] {
    const emotions: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Multilingual emotion detection patterns
    const emotionPatterns = {
      anger: {
        en: ['angry', 'mad', 'furious', 'hate', 'fed up', 'tired of', 'rage', 'livid'],
        es: ['enojado', 'furioso', 'rabioso', 'odio', 'harto', 'cansado de', 'ira'],
        fr: ['fâché', 'furieux', 'enragé', 'déteste', 'marre', 'fatigué de', 'colère'],
        de: ['wütend', 'wütend', 'wütend', 'hasse', 'satt', 'müde von', 'wut'],
        it: ['arrabbiato', 'furioso', 'rabbioso', 'odio', 'stufo', 'stanco di', 'rabbia'],
        pt: ['irritado', 'furioso', 'raivoso', 'odeio', 'cansado de', 'farto de', 'raiva'],
        ru: ['злой', 'бешеный', 'яростный', 'ненавижу', 'надоело', 'устал от', 'гнев'],
        zh: ['生气', '愤怒', '狂怒', '恨', '受够了', '厌倦', '愤怒'],
        ja: ['怒っている', '激怒', '怒り狂った', '憎む', 'うんざり', '疲れた', '怒り'],
        ar: ['غاضب', 'غاضب', 'غاضب', 'أكره', 'مللت', 'متعب من', 'غضب']
      },
      sadness: {
        en: ['sad', 'hurt', 'disappointed', 'heartbroken', 'lonely', 'empty', 'depressed'],
        es: ['triste', 'herido', 'decepcionado', 'desconsolado', 'solo', 'vacío', 'deprimido'],
        fr: ['triste', 'blessé', 'déçu', 'déchiré', 'seul', 'vide', 'déprimé'],
        de: ['traurig', 'verletzt', 'enttäuscht', 'herzzerbrochen', 'einsam', 'leer', 'deprimiert'],
        it: ['triste', 'ferito', 'deluso', 'addolorato', 'solo', 'vuoto', 'depresso'],
        pt: ['triste', 'machucado', 'decepcionado', 'desolado', 'sozinho', 'vazio', 'deprimido'],
        ru: ['грустный', 'ранен', 'разочарован', 'с разбитым сердцем', 'одинокий', 'пустой', 'подавленный'],
        zh: ['悲伤', '受伤', '失望', '心碎', '孤独', '空虚', '沮丧'],
        ja: ['悲しい', '傷ついた', '失望した', '心が痛い', '孤独', '空虚', '落ち込んだ'],
        ar: ['حزين', 'مجروح', 'خائب الأمل', 'مكسور القلب', 'وحيد', 'فارغ', 'مكتئب']
      },
      fear: {
        en: ['afraid', 'scared', 'worried', 'anxious', 'fear', 'terrified', 'panic'],
        es: ['asustado', 'aterrado', 'preocupado', 'ansioso', 'miedo', 'aterrorizado', 'pánico'],
        fr: ['effrayé', 'terrifié', 'inquiet', 'anxieux', 'peur', 'terrifié', 'panique'],
        de: ['ängstlich', 'verängstigt', 'besorgt', 'ängstlich', 'angst', 'verängstigt', 'panik'],
        it: ['spaventato', 'terrorizzato', 'preoccupato', 'ansioso', 'paura', 'terrorizzato', 'panico'],
        pt: ['assustado', 'aterrorizado', 'preocupado', 'ansioso', 'medo', 'aterrorizado', 'pânico'],
        ru: ['испуганный', 'напуганный', 'обеспокоенный', 'тревожный', 'страх', 'ужас', 'паника'],
        zh: ['害怕', '恐惧', '担心', '焦虑', '恐惧', ' terrified', '恐慌'],
        ja: ['怖い', '恐れている', '心配', '不安', '恐れ', '恐怖', 'パニック'],
        ar: ['خائف', 'خائف', 'قلق', 'قلق', 'خوف', 'مرعوب', 'ذعر']
      },
      frustration: {
        en: ['frustrated', 'confused', 'stuck', 'helpless', 'hopeless', 'overwhelmed'],
        es: ['frustrado', 'confundido', 'atascado', 'indefenso', 'desesperado', 'abrumado'],
        fr: ['frustré', 'confus', 'coincé', 'impuissant', 'désespéré', 'débordé'],
        de: ['frustriert', 'verwirrt', 'festgefahren', 'hilflos', 'hoffnungslos', 'überwältigt'],
        it: ['frustrato', 'confuso', 'bloccato', 'indifeso', 'disperato', 'sopraffatto'],
        pt: ['frustrado', 'confuso', 'preso', 'indefeso', 'desesperado', 'sobrecarregado'],
        ru: ['разочарован', 'запутанный', 'застрял', 'беспомощный', 'безнадежный', 'подавленный'],
        zh: ['沮丧', '困惑', '卡住', '无助', '绝望', '不堪重负'],
        ja: ['イライラ', '混乱', '行き詰まった', '無力', '絶望的', '圧倒された'],
        ar: ['محبط', 'مرتبك', 'عالق', 'عاجز', 'يائس', 'مرهق']
      },
      defensiveness: {
        en: ['always', 'never', 'you always', 'you never', 'it\'s not my fault', 'defensive'],
        es: ['siempre', 'nunca', 'siempre', 'nunca', 'no es mi culpa', 'defensivo'],
        fr: ['toujours', 'jamais', 'toujours', 'jamais', 'ce n\'est pas ma faute', 'défensif'],
        de: ['immer', 'nie', 'immer', 'nie', 'es ist nicht meine schuld', 'defensiv'],
        it: ['sempre', 'mai', 'sempre', 'mai', 'non è colpa mia', 'difensivo'],
        pt: ['sempre', 'nunca', 'sempre', 'nunca', 'não é minha culpa', 'defensivo'],
        ru: ['всегда', 'никогда', 'всегда', 'никогда', 'это не моя вина', 'оборонительный'],
        zh: ['总是', '从不', '总是', '从不', '不是我的错', '防御性'],
        ja: ['いつも', '決して', 'いつも', '決して', '私のせいではない', '防御的'],
        ar: ['دائماً', 'أبداً', 'دائماً', 'أبداً', 'ليس خطأي', 'دفاعي']
      }
    };

    Object.entries(emotionPatterns).forEach(([emotion, langPatterns]) => {
      const currentPatterns = langPatterns[this.language as keyof typeof langPatterns] || langPatterns.en;
      if (currentPatterns.some(word => lowerMessage.includes(word))) {
        emotions.push(emotion);
      }
    });

    return emotions;
  }

  private identifyNeeds(message: string): string[] {
    const needs: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Multilingual needs detection patterns
    const needsPatterns = {
      to_be_heard: {
        en: ['listen', 'hear', 'understand', 'heard', 'listening'],
        es: ['escuchar', 'oír', 'entender', 'escuchado', 'escuchando'],
        fr: ['écouter', 'entendre', 'comprendre', 'entendu', 'écoutant'],
        de: ['zuhören', 'hören', 'verstehen', 'gehört', 'zuhörend'],
        it: ['ascoltare', 'sentire', 'capire', 'sentito', 'ascoltando'],
        pt: ['ouvir', 'escutar', 'entender', 'ouvido', 'escutando'],
        ru: ['слушать', 'слышать', 'понимать', 'услышанный', 'слушающий'],
        zh: ['听', '听到', '理解', '听到', '倾听'],
        ja: ['聞く', '聞こえる', '理解する', '聞いた', '聞いている'],
        ar: ['استمع', 'سمع', 'فهم', 'سمع', 'يستمع']
      },
      connection: {
        en: ['care', 'love', 'attention', 'close', 'together', 'bond'],
        es: ['cuidar', 'amar', 'atención', 'cerca', 'juntos', 'vínculo'],
        fr: ['soin', 'amour', 'attention', 'proche', 'ensemble', 'lien'],
        de: ['pflege', 'liebe', 'aufmerksamkeit', 'nah', 'zusammen', 'bindung'],
        it: ['cura', 'amore', 'attenzione', 'vicino', 'insieme', 'legame'],
        pt: ['cuidar', 'amor', 'atenção', 'perto', 'juntos', 'vínculo'],
        ru: ['забота', 'любовь', 'внимание', 'близко', 'вместе', 'связь'],
        zh: ['关心', '爱', '注意', '亲近', '一起', '联系'],
        ja: ['世話', '愛', '注意', '近い', '一緒に', '絆'],
        ar: ['رعاية', 'حب', 'اهتمام', 'قريب', 'معاً', 'رابطة']
      },
      support: {
        en: ['help', 'support', 'need', 'assist', 'backup'],
        es: ['ayuda', 'apoyo', 'necesito', 'asistir', 'respaldo'],
        fr: ['aide', 'soutien', 'besoin', 'assister', 'sauvegarde'],
        de: ['hilfe', 'unterstützung', 'brauchen', 'helfen', 'rückendeckung'],
        it: ['aiuto', 'supporto', 'bisogno', 'assistere', 'backup'],
        pt: ['ajuda', 'apoio', 'preciso', 'assistir', 'respaldo'],
        ru: ['помощь', 'поддержка', 'нужда', 'помогать', 'поддержка'],
        zh: ['帮助', '支持', '需要', '协助', '备份'],
        ja: ['助け', 'サポート', '必要', '支援', 'バックアップ'],
        ar: ['مساعدة', 'دعم', 'حاجة', 'مساعدة', 'دعم']
      },
      change: {
        en: ['change', 'different', 'better', 'improve', 'fix'],
        es: ['cambiar', 'diferente', 'mejor', 'mejorar', 'arreglar'],
        fr: ['changer', 'différent', 'mieux', 'améliorer', 'réparer'],
        de: ['ändern', 'anders', 'besser', 'verbessern', 'reparieren'],
        it: ['cambiare', 'diverso', 'meglio', 'migliorare', 'riparare'],
        pt: ['mudar', 'diferente', 'melhor', 'melhorar', 'consertar'],
        ru: ['изменить', 'другой', 'лучше', 'улучшить', 'исправить'],
        zh: ['改变', '不同', '更好', '改善', '修复'],
        ja: ['変える', '違う', 'より良い', '改善', '修正'],
        ar: ['تغيير', 'مختلف', 'أفضل', 'تحسين', 'إصلاح']
      },
      respect: {
        en: ['respect', 'appreciate', 'value', 'honor', 'dignity'],
        es: ['respetar', 'apreciar', 'valorar', 'honrar', 'dignidad'],
        fr: ['respecter', 'apprécier', 'valoriser', 'honorer', 'dignité'],
        de: ['respektieren', 'schätzen', 'würdigen', 'ehren', 'würde'],
        it: ['rispettare', 'apprezzare', 'valorizzare', 'onorare', 'dignità'],
        pt: ['respeitar', 'apreciar', 'valorizar', 'honrar', 'dignidade'],
        ru: ['уважать', 'ценить', 'ценить', 'почитать', 'достоинство'],
        zh: ['尊重', '欣赏', '重视', '尊敬', '尊严'],
        ja: ['尊敬', '感謝', '価値', '尊敬', '尊厳'],
        ar: ['احترام', 'تقدير', 'قيمة', 'شرف', 'كرامة']
      }
    };

    Object.entries(needsPatterns).forEach(([need, langPatterns]) => {
      const currentPatterns = langPatterns[this.language as keyof typeof langPatterns] || langPatterns.en;
      if (currentPatterns.some(word => lowerMessage.includes(word))) {
        needs.push(need);
      }
    });

    return needs;
  }

  private determineIntervention(emotions: string[], needs: string[], messageType: 'user' | 'partner' | 'ai_therapist'): string {
    // Active Listening and Validation
    if (emotions.includes('sadness') || emotions.includes('hurt')) {
      return this.generateValidationResponse(emotions, needs);
    }

    // De-escalation for Anger
    if (emotions.includes('anger') || emotions.includes('frustration')) {
      return this.generateDeEscalationResponse(emotions, needs);
    }

    // Reframing for Defensiveness
    if (emotions.includes('defensiveness')) {
      return this.generateReframingResponse(emotions, needs);
    }

    // Connection building
    if (needs.includes('connection') || needs.includes('to_be_heard')) {
      return this.generateConnectionResponse(needs);
    }

    // Default therapeutic response
    return this.generateDefaultTherapeuticResponse(emotions, needs);
  }

  private generateValidationResponse(emotions: string[], needs: string[]): string {
    const responses = {
      en: [
        "I can hear how much this is affecting you. It sounds like you're feeling really hurt and that's completely valid.",
        "What you're experiencing sounds really painful. It makes sense that you'd feel this way given what you've shared.",
        "I can see how much this matters to you. Your feelings are important and deserve to be acknowledged.",
        "It sounds like you're carrying a lot of emotional weight right now. That's a lot to hold on your own.",
        "I hear the pain in what you're saying. It sounds like you've been feeling this way for a while."
      ],
      es: [
        "Puedo escuchar cuánto te está afectando esto. Parece que te sientes realmente herido y eso es completamente válido.",
        "Lo que estás experimentando suena realmente doloroso. Tiene sentido que te sientas así dado lo que has compartido.",
        "Puedo ver cuánto te importa esto. Tus sentimientos son importantes y merecen ser reconocidos.",
        "Parece que estás cargando mucho peso emocional ahora mismo. Eso es mucho para llevar solo.",
        "Escucho el dolor en lo que dices. Parece que has estado sintiéndote así por un tiempo."
      ],
      fr: [
        "Je peux entendre à quel point cela vous affecte. Il semble que vous vous sentiez vraiment blessé et c'est tout à fait valide.",
        "Ce que vous vivez semble vraiment douloureux. Il est logique que vous vous sentiez ainsi compte tenu de ce que vous avez partagé.",
        "Je peux voir à quel point cela vous importe. Vos sentiments sont importants et méritent d'être reconnus.",
        "Il semble que vous portiez beaucoup de poids émotionnel en ce moment. C'est beaucoup à porter seul.",
        "J'entends la douleur dans ce que vous dites. Il semble que vous vous sentiez ainsi depuis un moment."
      ],
      de: [
        "Ich kann hören, wie sehr Sie das betrifft. Es klingt, als würden Sie sich wirklich verletzt fühlen und das ist völlig berechtigt.",
        "Was Sie erleben, klingt wirklich schmerzhaft. Es macht Sinn, dass Sie sich so fühlen, angesichts dessen, was Sie geteilt haben.",
        "Ich kann sehen, wie wichtig Ihnen das ist. Ihre Gefühle sind wichtig und verdienen Anerkennung.",
        "Es scheint, als würden Sie gerade viel emotionales Gewicht tragen. Das ist viel, um es allein zu tragen.",
        "Ich höre den Schmerz in dem, was Sie sagen. Es scheint, als würden Sie sich schon eine Weile so fühlen."
      ],
      it: [
        "Posso sentire quanto questo ti stia colpendo. Sembra che ti senta davvero ferito e questo è completamente valido.",
        "Quello che stai vivendo sembra davvero doloroso. Ha senso che ti senta così dato quello che hai condiviso.",
        "Posso vedere quanto questo ti importi. I tuoi sentimenti sono importanti e meritano di essere riconosciuti.",
        "Sembra che tu stia portando molto peso emotivo in questo momento. È molto da portare da solo.",
        "Sento il dolore in quello che dici. Sembra che ti senta così da un po' di tempo."
      ],
      pt: [
        "Posso ouvir o quanto isso está te afetando. Parece que você está se sentindo realmente ferido e isso é completamente válido.",
        "O que você está experimentando parece realmente doloroso. Faz sentido que você se sinta assim dado o que compartilhou.",
        "Posso ver o quanto isso importa para você. Seus sentimentos são importantes e merecem ser reconhecidos.",
        "Parece que você está carregando muito peso emocional agora. Isso é muito para carregar sozinho.",
        "Ouço a dor no que você está dizendo. Parece que você tem se sentido assim há um tempo."
      ],
      ru: [
        "Я слышу, как сильно это вас задевает. Похоже, что вы чувствуете себя действительно обиженным, и это совершенно нормально.",
        "То, что вы переживаете, звучит действительно болезненно. Логично, что вы так себя чувствуете, учитывая то, что вы поделились.",
        "Я вижу, как много для вас это значит. Ваши чувства важны и заслуживают признания.",
        "Похоже, что вы несете много эмоционального груза прямо сейчас. Это много для того, чтобы нести в одиночку.",
        "Я слышу боль в том, что вы говорите. Похоже, что вы так себя чувствуете уже некоторое время."
      ],
      zh: [
        "我能听到这对你影响有多大。听起来你感到真的很受伤，这完全是合理的。",
        "你所经历的事情听起来真的很痛苦。考虑到你分享的内容，你这样感觉是有道理的。",
        "我能看到这对你有多重要。你的感受很重要，值得被认可。",
        "听起来你现在背负着很多情感负担。独自承担这些太多了。",
        "我听到你话语中的痛苦。听起来你已经这样感觉一段时间了。"
      ],
      ja: [
        "これがあなたにどれほど影響しているか聞こえます。本当に傷ついているように聞こえ、それは完全に妥当です。",
        "あなたが経験していることは本当に痛いように聞こえます。あなたが共有したことを考えると、あなたがそう感じるのは理にかなっています。",
        "これがあなたにとってどれほど重要か見えます。あなたの感情は重要で、認められる価値があります。",
        "今、多くの感情的な重荷を背負っているように聞こえます。一人で抱えるには多すぎます。",
        "あなたが言っていることの中に痛みを聞きます。しばらくの間、あなたはそう感じているようです。"
      ],
      ar: [
        "أستطيع أن أسمع كم يؤثر هذا عليك. يبدو أنك تشعر بالأذى حقاً وهذا صحيح تماماً.",
        "ما تمر به يبدو مؤلماً حقاً. من المنطقي أن تشعر بهذا الطريقة بالنظر إلى ما شاركته.",
        "أستطيع أن أرى كم هذا مهم بالنسبة لك. مشاعرك مهمة وتستحق الاعتراف بها.",
        "يبدو أنك تحمل الكثير من الوزن العاطفي الآن. هذا كثير للتحمل بمفردك.",
        "أسمع الألم في ما تقوله. يبدو أنك تشعر بهذا الطريقة منذ فترة."
      ]
    };
    
    const currentResponses = responses[this.language as keyof typeof responses] || responses.en;
    return currentResponses[Math.floor(Math.random() * currentResponses.length)];
  }

  private generateDeEscalationResponse(emotions: string[], needs: string[]): string {
    const responses = [
      "I can see this is really frustrating for you. Let's take a moment to breathe together. What's underneath this anger?",
      "It sounds like you're feeling really fed up. That's understandable. Can you help me understand what's at the heart of this?",
      "I hear how upset you are. Let's slow down a bit. What's the most important thing you want your partner to understand right now?",
      "This seems to be really triggering for you. What's the deeper feeling behind this frustration?",
      "I can feel the intensity of your emotions. Let's explore what's really driving this reaction."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateReframingResponse(emotions: string[], needs: string[]): string {
    const responses = [
      "I wonder if we could look at this from a different angle. What if this isn't about who's right or wrong, but about understanding each other's perspectives?",
      "It sounds like you're both feeling protective of your positions. What if we focused on what you both want for your relationship instead?",
      "I hear you both making valid points. What if the issue isn't about blame, but about finding a way forward together?",
      "It seems like you're both feeling misunderstood. What if we shifted from defending positions to understanding feelings?",
      "I wonder if we could step back and see this as a pattern you're both caught in, rather than something one person is doing to the other."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateConnectionResponse(needs: string[]): string {
    const responses = [
      "It sounds like you're really wanting to feel connected and understood. That's a fundamental human need.",
      "I hear you asking to be seen and heard. That's so important in any relationship.",
      "It sounds like you're longing for more closeness. What would that look like for you?",
      "I can feel how much you want to feel valued and important to your partner. That's completely natural.",
      "It sounds like you're seeking reassurance that you matter. That's a beautiful and valid need."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateDefaultTherapeuticResponse(emotions: string[], needs: string[]): string {
    const responses = [
      "I'm hearing a lot of emotion in what you're sharing. Can you tell me more about what's behind these feelings?",
      "This seems to be touching on something really important for you. What makes this so significant?",
      "I can sense there's more to this than what's being said. What's the deeper story here?",
      "It sounds like this is about more than just this moment. What's the bigger picture for you?",
      "I'm curious about what this is bringing up for you. What does this remind you of?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateFollowUpQuestions(emotions: string[], needs: string[], messageType: 'user' | 'partner' | 'ai_therapist'): string[] {
    const questions: string[] = [];

    if (emotions.includes('anger')) {
      questions.push("What's underneath this anger? What are you really afraid of?");
      questions.push("What would it look like to express this differently?");
    }

    if (emotions.includes('sadness')) {
      questions.push("What do you need most right now?");
      questions.push("How can your partner support you in this moment?");
    }

    if (needs.includes('to_be_heard')) {
      questions.push("What would it feel like to be truly heard?");
      questions.push("How would you know if your partner really understood?");
    }

    if (needs.includes('connection')) {
      questions.push("What does connection look like for you?");
      questions.push("How do you feel most loved and valued?");
    }

    // Add relationship-focused questions
    questions.push("What's one thing you'd like to understand better about your partner's perspective?");
    questions.push("What's one small step you could take to move toward each other?");

    return questions.slice(0, 3); // Return max 3 questions
  }

  // Generate AI therapeutic response
  generateResponse(messages: Message[], currentUserId: string): {
    content: string;
    interventionType: string;
    followUpQuestions: string[];
  } {
    const recentMessages = messages.slice(-3); // Look at last 3 messages
    const userMessages = recentMessages.filter(m => m.message_type === 'user' || m.message_type === 'partner');
    
    if (userMessages.length === 0) {
      return {
        content: "I'm here to support you both in this session. What would you like to explore today?",
        interventionType: 'opening',
        followUpQuestions: [
          "What brought you to this session today?",
          "What's one thing you'd like to work on together?",
          "How are you both feeling about being here?"
        ]
      };
    }

    const lastMessage = userMessages[userMessages.length - 1];
    const analysis = this.analyzeMessage(lastMessage.content, lastMessage.message_type);

    // Check for escalation patterns
    const escalationPattern = this.detectEscalationPattern(recentMessages);
    if (escalationPattern) {
      return {
        content: "I'm noticing some escalation in your conversation. Let's pause for a moment. Can you both take a deep breath? What's happening for each of you right now?",
        interventionType: 'de_escalation',
        followUpQuestions: [
          "What's the most important thing you want to be understood?",
          "What would help you feel calmer right now?",
          "How can we create a safer space for this conversation?"
        ]
      };
    }

    // Check for withdrawal patterns
    const withdrawalPattern = this.detectWithdrawalPattern(recentMessages);
    if (withdrawalPattern) {
      return {
        content: "I'm sensing some withdrawal happening. This is a common protective response. What's making you want to pull back? What would help you feel safe enough to stay engaged?",
        interventionType: 'engagement',
        followUpQuestions: [
          "What's the risk you're trying to avoid?",
          "What would make it safer to stay in this conversation?",
          "What do you need from your partner to feel more secure?"
        ]
      };
    }

    return {
      content: analysis.therapeuticIntervention,
      interventionType: 'therapeutic_response',
      followUpQuestions: analysis.followUpQuestions
    };
  }

  private detectEscalationPattern(messages: Message[]): boolean {
    const recentTexts = messages.map(m => m.content.toLowerCase());
    const escalationWords = ['always', 'never', 'you always', 'you never', 'hate', 'fed up', 'done'];
    return escalationWords.some(word => recentTexts.some(text => text.includes(word)));
  }

  private detectWithdrawalPattern(messages: Message[]): boolean {
    const recentTexts = messages.map(m => m.content.toLowerCase());
    const withdrawalWords = ['i don\'t know', 'whatever', 'fine', 'i give up', 'not worth it'];
    return withdrawalWords.some(word => recentTexts.some(text => text.includes(word)));
  }
}

export default function CoupleTherapyChat() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();
  const [therapyAI, setTherapyAI] = useState<CoupleTherapyAI | null>(null);

  // Language-specific UI translations
  const translations = {
    en: {
      back: 'Back',
      therapist: 'Therapist',
      you: 'You',
      partner: 'Partner',
      welcome: 'Welcome to your couple therapy session',
      welcomeDesc: 'I\'m here to support you both. Start by sharing what\'s on your mind, and I\'ll help guide the conversation.',
      placeholder: 'Share your thoughts, feelings, or concerns...',
      supportMessage: 'I\'m here to support you both. Share openly and honestly.',
      considerQuestions: 'Consider these questions:',
      loading: 'Loading therapy session...',
      sessionNotFound: 'Session not found',
      failedToLoad: 'Failed to load session data',
      failedToSend: 'Failed to send message',
      started: 'Started'
    },
    es: {
      back: 'Atrás',
      therapist: 'Terapeuta',
      you: 'Tú',
      partner: 'Pareja',
      welcome: 'Bienvenido a tu sesión de terapia de pareja',
      welcomeDesc: 'Estoy aquí para apoyarlos a ambos. Comienza compartiendo lo que tienes en mente, y te ayudaré a guiar la conversación.',
      placeholder: 'Comparte tus pensamientos, sentimientos o preocupaciones...',
      supportMessage: 'Estoy aquí para apoyarlos a ambos. Comparte abierta y honestamente.',
      considerQuestions: 'Considera estas preguntas:',
      loading: 'Cargando sesión de terapia...',
      sessionNotFound: 'Sesión no encontrada',
      failedToLoad: 'Error al cargar datos de la sesión',
      failedToSend: 'Error al enviar mensaje',
      started: 'Comenzó'
    },
    fr: {
      back: 'Retour',
      therapist: 'Thérapeute',
      you: 'Vous',
      partner: 'Partenaire',
      welcome: 'Bienvenue à votre séance de thérapie de couple',
      welcomeDesc: 'Je suis ici pour vous soutenir tous les deux. Commencez par partager ce qui vous préoccupe, et je vous aiderai à guider la conversation.',
      placeholder: 'Partagez vos pensées, sentiments ou préoccupations...',
      supportMessage: 'Je suis ici pour vous soutenir tous les deux. Partagez ouvertement et honnêtement.',
      considerQuestions: 'Considérez ces questions :',
      loading: 'Chargement de la séance de thérapie...',
      sessionNotFound: 'Séance introuvable',
      failedToLoad: 'Échec du chargement des données de la séance',
      failedToSend: 'Échec de l\'envoi du message',
      started: 'Commencé'
    },
    de: {
      back: 'Zurück',
      therapist: 'Therapeut',
      you: 'Sie',
      partner: 'Partner',
      welcome: 'Willkommen zu Ihrer Paartherapie-Sitzung',
      welcomeDesc: 'Ich bin hier, um Sie beide zu unterstützen. Beginnen Sie damit, zu teilen, was Ihnen auf dem Herzen liegt, und ich helfe Ihnen, das Gespräch zu führen.',
      placeholder: 'Teilen Sie Ihre Gedanken, Gefühle oder Bedenken...',
      supportMessage: 'Ich bin hier, um Sie beide zu unterstützen. Teilen Sie offen und ehrlich.',
      considerQuestions: 'Betrachten Sie diese Fragen:',
      loading: 'Therapie-Sitzung wird geladen...',
      sessionNotFound: 'Sitzung nicht gefunden',
      failedToLoad: 'Fehler beim Laden der Sitzungsdaten',
      failedToSend: 'Fehler beim Senden der Nachricht',
      started: 'Gestartet'
    },
    it: {
      back: 'Indietro',
      therapist: 'Terapeuta',
      you: 'Tu',
      partner: 'Partner',
      welcome: 'Benvenuto alla tua sessione di terapia di coppia',
      welcomeDesc: 'Sono qui per sostenervi entrambi. Inizia condividendo quello che hai in mente, e ti aiuterò a guidare la conversazione.',
      placeholder: 'Condividi i tuoi pensieri, sentimenti o preoccupazioni...',
      supportMessage: 'Sono qui per sostenervi entrambi. Condividi apertamente e onestamente.',
      considerQuestions: 'Considera queste domande:',
      loading: 'Caricamento sessione di terapia...',
      sessionNotFound: 'Sessione non trovata',
      failedToLoad: 'Errore nel caricamento dei dati della sessione',
      failedToSend: 'Errore nell\'invio del messaggio',
      started: 'Iniziato'
    },
    pt: {
      back: 'Voltar',
      therapist: 'Terapeuta',
      you: 'Você',
      partner: 'Parceiro',
      welcome: 'Bem-vindo à sua sessão de terapia de casal',
      welcomeDesc: 'Estou aqui para apoiar vocês dois. Comece compartilhando o que está em sua mente, e eu ajudarei a guiar a conversa.',
      placeholder: 'Compartilhe seus pensamentos, sentimentos ou preocupações...',
      supportMessage: 'Estou aqui para apoiar vocês dois. Compartilhe abertamente e honestamente.',
      considerQuestions: 'Considere estas perguntas:',
      loading: 'Carregando sessão de terapia...',
      sessionNotFound: 'Sessão não encontrada',
      failedToLoad: 'Falha ao carregar dados da sessão',
      failedToSend: 'Falha ao enviar mensagem',
      started: 'Iniciado'
    },
    ru: {
      back: 'Назад',
      therapist: 'Терапевт',
      you: 'Вы',
      partner: 'Партнер',
      welcome: 'Добро пожаловать на сеанс парной терапии',
      welcomeDesc: 'Я здесь, чтобы поддержать вас обоих. Начните с того, что поделитесь тем, что у вас на уме, и я помогу направить разговор.',
      placeholder: 'Поделитесь своими мыслями, чувствами или опасениями...',
      supportMessage: 'Я здесь, чтобы поддержать вас обоих. Делитесь открыто и честно.',
      considerQuestions: 'Рассмотрите эти вопросы:',
      loading: 'Загрузка сеанса терапии...',
      sessionNotFound: 'Сеанс не найден',
      failedToLoad: 'Не удалось загрузить данные сеанса',
      failedToSend: 'Не удалось отправить сообщение',
      started: 'Начато'
    },
    zh: {
      back: '返回',
      therapist: '治疗师',
      you: '你',
      partner: '伴侣',
      welcome: '欢迎来到你们的夫妻治疗课程',
      welcomeDesc: '我在这里支持你们两个人。开始分享你心中的想法，我会帮助引导对话。',
      placeholder: '分享你的想法、感受或担忧...',
      supportMessage: '我在这里支持你们两个人。开放和诚实地分享。',
      considerQuestions: '考虑这些问题：',
      loading: '正在加载治疗课程...',
      sessionNotFound: '未找到课程',
      failedToLoad: '加载课程数据失败',
      failedToSend: '发送消息失败',
      started: '开始'
    },
    ja: {
      back: '戻る',
      therapist: 'セラピスト',
      you: 'あなた',
      partner: 'パートナー',
      welcome: 'カップルセラピーセッションへようこそ',
      welcomeDesc: '私はあなたたち両方をサポートするためにここにいます。心にあることを共有することから始めて、会話を導くお手伝いをします。',
      placeholder: 'あなたの考え、感情、懸念を共有してください...',
      supportMessage: '私はあなたたち両方をサポートするためにここにいます。オープンで正直に共有してください。',
      considerQuestions: 'これらの質問を検討してください：',
      loading: 'セラピーセッションを読み込み中...',
      sessionNotFound: 'セッションが見つかりません',
      failedToLoad: 'セッションデータの読み込みに失敗しました',
      failedToSend: 'メッセージの送信に失敗しました',
      started: '開始'
    },
    ar: {
      back: 'رجوع',
      therapist: 'معالج',
      you: 'أنت',
      partner: 'شريك',
      welcome: 'مرحباً بك في جلسة العلاج الزوجي',
      welcomeDesc: 'أنا هنا لدعمكما معاً. ابدأ بمشاركة ما يدور في ذهنك، وسأساعد في توجيه المحادثة.',
      placeholder: 'شارك أفكارك ومشاعرك أو مخاوفك...',
      supportMessage: 'أنا هنا لدعمكما معاً. شارك بصراحة وأمانة.',
      considerQuestions: 'فكر في هذه الأسئلة:',
      loading: 'جاري تحميل جلسة العلاج...',
      sessionNotFound: 'لم يتم العثور على الجلسة',
      failedToLoad: 'فشل في تحميل بيانات الجلسة',
      failedToSend: 'فشل في إرسال الرسالة',
      started: 'بدأ'
    }
  };

  useEffect(() => {
    loadSessionAndMessages();
    const user = supabase.auth.getUser();
    setCurrentUser(user);

    // Set up realtime subscription
    const channel = supabase
      .channel(`couple_therapy_messages_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'couple_therapy_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Initialize AI with session language when session loads
  useEffect(() => {
    if (session?.language) {
      setTherapyAI(new CoupleTherapyAI(session.language));
    }
  }, [session?.language]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSessionAndMessages = async () => {
    try {
      setLoading(true);
      
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('couple_therapy_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('couple_therapy_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

    } catch (error) {
      console.error('Error loading session and messages:', error);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      setSending(true);
      
      // Determine message type based on current user
      const messageType = currentUser.id === session?.creator_id ? 'user' : 'partner';
      
      // Insert user message
      const { data: userMessage, error: userError } = await supabase
        .from('couple_therapy_messages')
        .insert({
          session_id: sessionId,
          user_id: currentUser.id,
          content: newMessage,
          message_type: messageType,
          content_type: 'text',
          is_visible_to_partner: true
        })
        .select()
        .single();

      if (userError) throw userError;

      setNewMessage('');

      // Generate AI therapeutic response
      if (!therapyAI) return;
      const aiResponse = therapyAI.generateResponse([...messages, userMessage], currentUser.id);
      
      // Wait a moment before AI responds (more natural)
      setTimeout(async () => {
        const { error: aiError } = await supabase
          .from('couple_therapy_messages')
          .insert({
            session_id: sessionId,
            user_id: 'ai-therapist',
            content: aiResponse.content,
            message_type: 'ai_therapist',
            content_type: 'therapeutic_intervention',
            is_visible_to_partner: true,
            metadata: {
              therapeutic_technique: aiResponse.interventionType,
              intervention_type: aiResponse.interventionType,
              follow_up_questions: aiResponse.followUpQuestions
            }
          });

        if (aiError) {
          console.error('Error sending AI response:', aiError);
        }
      }, 2000);

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = (message: Message) => {
    switch (message.message_type) {
      case 'ai_therapist':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'user':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'partner':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getMessageIcon = (message: Message) => {
    switch (message.message_type) {
      case 'ai_therapist':
        return <MessageCircle className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'partner':
        return <Users className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  // Get current language translations
  const currentLang = session?.language || 'en';
  const t = translations[currentLang as keyof typeof translations] || translations.en;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || t.sessionNotFound}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/escape/couple-therapy">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.back}
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{session.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Badge className={getStatusColor(session.status)}>
                  {formatSessionStatus(session.status)}
                </Badge>
                <span>•</span>
                <span>{session.language.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{t.started} {new Date(session.started_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-200px)]">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t.welcome}</h3>
            <p className="text-gray-600">
              {t.welcomeDesc}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.message_type === 'ai_therapist' ? 'justify-center' : 
                message.user_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-[80%] p-3 ${getMessageStyle(message)}`}>
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-1">
                    {getMessageIcon(message)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.message_type === 'ai_therapist' ? t.therapist :
                         message.message_type === 'user' ? t.you : t.partner}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Show follow-up questions for AI messages */}
                    {message.message_type === 'ai_therapist' && 
                     message.metadata?.follow_up_questions && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-2">{t.considerQuestions}</p>
                        <ul className="text-xs text-blue-600 space-y-1">
                          {message.metadata.follow_up_questions.map((question, index) => (
                            <li key={index} className="flex items-start space-x-1">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.placeholder}
            className="flex-1"
            disabled={sending}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {t.supportMessage}
        </p>
      </div>
    </div>
  );
} 