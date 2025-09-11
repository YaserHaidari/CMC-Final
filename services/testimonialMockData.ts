export const mockTestimonialStats = {
  total_reviews: 28,
  average_rating: 4.6,
  rating_1: 0,
  rating_2: 1,
  rating_3: 2,
  rating_4: 7,
  rating_5: 18
};

export const mockTestimonials = [
  {
    id: "1",
    testimonial_text: "Sarah's expertise in penetration testing and network security is exceptional. She helped me prepare for my OSCP certification and provided invaluable insights from her experience at major Australian banks.",
    rating: 5,
    created_at: "2025-09-01T10:30:00Z",
    is_featured: true,
    mentee_name: "James Wilson",
    mentee_avatar_url: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    id: "2",
    testimonial_text: "Amazing mentor who helped me understand the Australian cybersecurity landscape. Her guidance on compliance with the Security Legislation Amendment (Critical Infrastructure) Act was particularly helpful.",
    rating: 5,
    created_at: "2025-08-28T14:20:00Z",
    is_featured: true,
    mentee_name: "Emily Chen",
    mentee_avatar_url: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    id: "3",
    testimonial_text: "Great insights into incident response and threat hunting. The practical exercises using Australian case studies were extremely valuable for my role at a Sydney-based SOC.",
    rating: 4,
    created_at: "2025-08-25T09:15:00Z",
    is_featured: false,
    mentee_name: "Michael O'Connor",
    mentee_avatar_url: "https://randomuser.me/api/portraits/men/22.jpg"
  },
  {
    id: "4",
    testimonial_text: "Invaluable mentoring on cloud security in AWS and Azure. The focus on securing critical infrastructure in accordance with ASD's Essential Eight was exactly what I needed.",
    rating: 5,
    created_at: "2025-08-20T16:45:00Z",
    is_featured: false,
    mentee_name: "Lisa Thompson",
    mentee_avatar_url: "https://randomuser.me/api/portraits/women/28.jpg"
  }
];

export const mockMentors = [
  {
    id: "101",
    name: "Sarah Mitchell",
    expertise: "Network Security & Penetration Testing"
  },
  {
    id: "102",
    name: "David Chen",
    expertise: "Cloud Security Architecture"
  },
  {
    id: "103",
    name: "Emma Watson",
    expertise: "Incident Response"
  }
];