export const siteMetadata = {
  /**
   * basic Information
   */
  title: `hooninedev.com`,
  description: `후니네`,
  language: `ko`,
  siteUrl: `https://hooninedev.com`,
  ogImage: `/og-image.jpeg`,

  /**
   * comments setting
   */
  comments: {
    utterances: {
      repo: `jiji-hoon96/jihoon-blog`,
    },
  },

  /**
   * introduce yourself
   */
  author: {
    name: `이지훈`,
    nickname: `후니`,
    stack: ["React", "Typescript", "Javascript", "Zustand"],
    bio: {
      email: `jihoon7705@gmail.com`,
      residence: "Seoul, South Korea",
    },
    social: {
      github: `https://github.com/jiji-hoon96`,
      linkedIn: `https://www.linkedin.com/in/jiji-hoon96`,
      resume: `https://www.figma.com/design/jM6I7TfZB6pOQxM5a51cVD/%EC%9D%B4%EC%A7%80%ED%9B%88-%EC%9D%B4%EB%A0%A5%EC%84%9C?node-id=0-1&t=0etn40XFHFxjDUPW-1`,
    },
    dropdown: {
      tistory: "",
      velog: "",
    },
  },

  /**
   * definition of featured posts
   */
  featured: [
    {
      title: "프론트엔드",
      category: "프론트엔드",
    },
    {
      title: "소박한궁금증",
      category: "소박한궁금증",
    },
    {
      title: "대외활동",
      category: "대외활동",
    },
    {
      title: "일상",
      category: "일상",
    },
  ],

  /**
   * pinned posts on homepage (use post slug)
   * Example: ['/240101', '/230816', '/240909']
   */
  pinnedPosts: [],

  /**
   * metadata for About Page
   */
  timestamps: [
    {
      category: "Career",
      date: "2023.03 - NOW",
      en: "HicareNet",
      kr: "하이케어넷",
      info: "Web-FrontEnd",
      link: "",
    },
    {
      category: "Activity",
      date: "2023.06 - 2023.12",
      en: "SIPE",
      kr: "사이프",
      info: "IT 커뮤니티-회원",
      link: "",
    },
    {
      category: "Activity",
      date: "2024.01 - 2024.07",
      en: "SIPE",
      kr: "사이프",
      info: "IT 커뮤니티-운영진",
      link: "",
    },
    {
      category: "Activity",
      date: "2024.06 - 2024.08",
      en: "DND",
      kr: "디엔디",
      info: "사이드 프로젝트 동아리-6조",
      link: "",
    },
  ],

  /**
   * metadata for Playground Page
   */
  projects: [
    {
      title: "Portfolio",
      description: "포트폴리오",
      techStack: ["React", "Next.js", "Typescript"],
      thumbnailUrl: "",
      links: {
        post: "",
        github: "",
        demo: "",
        googlePlay: "",
        appStore: "",
      },
    },
  ],
};
