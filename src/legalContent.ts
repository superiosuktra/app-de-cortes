export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const LEGAL_APP_NAME = 'ViralShorts Studio AI';
export const LEGAL_CONTACT_EMAIL = 'erick.moreiradefensoria@gmail.com';
export const LEGAL_UPDATED_AT_PT = '7 de outubro de 2026';

export const PRIVACY_POLICY_PT_SECTIONS: LegalSection[] = [
  {
    title: '1. Escopo desta Política',
    paragraphs: [
      `Esta Política de Privacidade explica como o ${LEGAL_APP_NAME} trata dados quando você usa o aplicativo para analisar vídeos, gerar cortes e publicar conteúdo em plataformas de terceiros.`,
      'Este texto descreve o funcionamento técnico atual do aplicativo e não substitui orientação ou revisão jurídica profissional.',
    ],
  },
  {
    title: '2. Dados tratados no uso do aplicativo',
    paragraphs: ['Podemos tratar os seguintes dados fornecidos por você durante o uso:'],
    bullets: [
      'URL de vídeos informada para análise.',
      'Transcrições, prompts, títulos, legendas, hashtags e configurações de cortes criados por você.',
      'Credenciais e tokens de integrações (por exemplo, YouTube, Instagram e TikTok) quando você conecta contas.',
      'Dados de status da conexão com plataformas integradas (como nome de conta/canal e avatar quando disponibilizados pela integração).',
    ],
  },
  {
    title: '3. Armazenamento local e sincronização de credenciais',
    paragraphs: [
      'O aplicativo salva cortes e credenciais no localStorage do seu navegador para manter sua sessão e preferências.',
      'Quando você salva credenciais, elas também podem ser enviadas ao endpoint /api/settings/credentials para sincronização com o backend da aplicação.',
      'Você pode limpar credenciais no próprio aplicativo e também remover dados locais limpando o armazenamento do navegador.',
    ],
  },
  {
    title: '4. Finalidades de uso',
    paragraphs: ['Os dados tratados são utilizados para:'],
    bullets: [
      'Executar funcionalidades de análise, edição e organização de cortes.',
      'Permitir integrações e publicação de conteúdo em plataformas conectadas, quando você solicitar.',
      'Exibir status de conexão e facilitar o gerenciamento das credenciais no painel do app.',
    ],
  },
  {
    title: '5. Compartilhamento com serviços de terceiros',
    paragraphs: [
      'Quando você usa integrações, dados e conteúdo podem ser compartilhados com as plataformas escolhidas por você, conforme as APIs e regras dessas plataformas.',
      'O uso de TikTok, YouTube, Instagram/Meta e outros serviços de terceiros está sujeito aos termos e políticas desses provedores.',
    ],
  },
  {
    title: '6. Retenção, exclusão e controle',
    paragraphs: [
      'Os dados permanecem pelo tempo necessário para operar os recursos utilizados por você, inclusive enquanto estiverem armazenados no seu navegador.',
      `Para solicitar exclusão de dados tratados pela aplicação, entre em contato pelo e-mail ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    title: '7. Segurança e limitações',
    paragraphs: [
      'Adotamos medidas técnicas e organizacionais proporcionais para reduzir riscos de acesso indevido.',
      'Nenhum sistema é totalmente invulnerável, portanto não há garantia absoluta de segurança, disponibilidade contínua ou ausência completa de falhas.',
    ],
  },
  {
    title: '8. Direitos e solicitações',
    paragraphs: [
      `Você pode solicitar informações sobre tratamento de dados, correções e exclusões por meio do e-mail ${LEGAL_CONTACT_EMAIL}.`,
      'A resposta pode depender de validação mínima de identidade e de requisitos legais aplicáveis.',
    ],
  },
  {
    title: '9. Alterações desta política',
    paragraphs: [
      `Esta política pode ser atualizada para refletir mudanças no aplicativo. A versão atual exibirá a data de atualização: ${LEGAL_UPDATED_AT_PT}.`,
    ],
  },
];

export const TERMS_OF_SERVICE_PT_SECTIONS: LegalSection[] = [
  {
    title: '1. Aceitação dos termos',
    paragraphs: [
      `Ao acessar e usar o ${LEGAL_APP_NAME}, você concorda com estes Termos de Serviço.`,
      'Se não concordar com os termos, não utilize o aplicativo.',
    ],
  },
  {
    title: '2. Descrição do serviço',
    paragraphs: [
      'O aplicativo oferece recursos para análise de conteúdo, criação de cortes e apoio à publicação em plataformas de terceiros.',
      'Os recursos podem ser alterados, limitados ou descontinuados a qualquer momento, com ou sem aviso prévio.',
    ],
  },
  {
    title: '3. Responsabilidade do usuário pelo conteúdo',
    paragraphs: ['Você é responsável pelo conteúdo que envia, edita e publica por meio do aplicativo.'],
    bullets: [
      'Garantir que possui direitos, autorizações e licenças necessários para uso e publicação do conteúdo.',
      'Respeitar direitos autorais, direitos de imagem, privacidade e legislação aplicável.',
      'Não utilizar o serviço para conteúdo ilícito, fraudulento, ofensivo ou que viole termos de plataformas de terceiros.',
    ],
  },
  {
    title: '4. Credenciais e integrações',
    paragraphs: [
      'Você é responsável por proteger credenciais, tokens e acessos que inserir no aplicativo.',
      'A publicação em redes sociais depende de APIs e serviços de terceiros, que podem ter indisponibilidade, mudanças de regras, limites de uso ou bloqueios.',
    ],
  },
  {
    title: '5. Disponibilidade, limitações e isenções',
    paragraphs: [
      'O serviço é fornecido conforme disponibilidade, sem promessa de funcionamento ininterrupto, desempenho específico, aprovação em plataformas externas ou resultado comercial.',
      'Não garantimos ausência total de erros, perdas de dados ou incompatibilidades com mudanças de serviços de terceiros.',
    ],
  },
  {
    title: '6. Serviços de terceiros',
    paragraphs: [
      'Seu uso de TikTok, YouTube, Instagram/Meta e outros serviços integrados segue também os termos e políticas dessas plataformas.',
      'Eventuais problemas nessas plataformas podem impactar recursos do aplicativo fora do nosso controle direto.',
    ],
  },
  {
    title: '7. Alterações dos termos',
    paragraphs: [
      `Estes termos podem ser atualizados periodicamente. A data de atualização exibida nesta versão é ${LEGAL_UPDATED_AT_PT}.`,
    ],
  },
  {
    title: '8. Contato',
    paragraphs: [`Dúvidas e solicitações: ${LEGAL_CONTACT_EMAIL}.`],
  },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sectionsToHtml = (sections: LegalSection[]) =>
  sections
    .map((section) => {
      const paragraphs = section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
      const bullets =
        section.bullets && section.bullets.length > 0
          ? `<ul>\n${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('\n')}\n</ul>`
          : '';
      return `<h2>${escapeHtml(section.title)}</h2>\n${paragraphs}\n${bullets}`;
    })
    .join('\n\n');

const sectionsToPlainText = (title: string, sections: LegalSection[]) =>
  `${title}\nÚltima atualização: ${LEGAL_UPDATED_AT_PT}\nContato: ${LEGAL_CONTACT_EMAIL}\n\n${sections
    .map((section) => {
      const paragraphs = section.paragraphs.join('\n');
      const bullets = section.bullets?.map((bullet) => `- ${bullet}`).join('\n') ?? '';
      return `${section.title}\n${paragraphs}${bullets ? `\n${bullets}` : ''}`;
    })
    .join('\n\n')}`;

export const PRIVACY_POLICY_PT_HTML = sectionsToHtml(PRIVACY_POLICY_PT_SECTIONS);
export const TERMS_OF_SERVICE_PT_HTML = sectionsToHtml(TERMS_OF_SERVICE_PT_SECTIONS);
export const PRIVACY_POLICY_PT_TEXT = sectionsToPlainText(
  `POLÍTICA DE PRIVACIDADE - ${LEGAL_APP_NAME}`,
  PRIVACY_POLICY_PT_SECTIONS
);
export const TERMS_OF_SERVICE_PT_TEXT = sectionsToPlainText(
  `TERMOS DE SERVIÇO - ${LEGAL_APP_NAME}`,
  TERMS_OF_SERVICE_PT_SECTIONS
);
