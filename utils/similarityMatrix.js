function generateSimilarityMatrix() {
    const tags = [
        "Artificial Intelligence", "Machine Learning", "Web Development", "Mobile Development", "Data Science", "Cybersecurity",
        "Blockchain", "Cloud Computing", "DevOps", "UI/UX Design", "Product Management", "Digital Marketing", "Entrepreneurship",
        "Startups", "Business Strategy", "Finance", "Sustainability", "Healthcare Tech", "EdTech", "Gaming", "AR/VR", "IoT",
        "Robotics", "Photography", "Writing", "JavaScript", "Python", "Java", "React", "Node.js", "SQL", "MongoDB", "AWS",
        "Docker", "Git", "Figma", "Photoshop", "Excel", "PowerPoint", "Public Speaking", "Leadership", "Project Management",
        "Research", "Data Analysis", "Content Writing", "Social Media", "SEO"
    ];

    const specificScores = new Map();
    const setScore = (tagA, tagB, score) => {
        const key = [tagA, tagB].sort().join('|');
        specificScores.set(key, score);
    };

   
    setScore("Artificial Intelligence", "Machine Learning", 0.9);
    setScore("Artificial Intelligence", "Data Science", 0.8);
    setScore("Machine Learning", "Data Science", 0.85);
    setScore("Data Science", "Data Analysis", 0.8);
    setScore("UI/UX Design", "Figma", 0.9);
    setScore("Digital Marketing", "SEO", 0.9);
    setScore("Web Development", "JavaScript", 0.8);
    setScore("JavaScript", "React", 0.8);
    setScore("JavaScript", "Node.js", 0.8);
    setScore("Cloud Computing", "AWS", 0.8);
    setScore("DevOps", "Cloud Computing", 0.8);
    setScore("DevOps", "Docker", 0.7);
    setScore("Entrepreneurship", "Startups", 0.8);
    setScore("Photography", "Photoshop", 0.7);
    setScore("SQL", "MongoDB", 0.6);
    setScore("Python", "Data Science", 0.7);
    setScore("Python", "Machine Learning", 0.7);
    setScore("Gaming", "AR/VR", 0.8);
    setScore("Java", "JavaScript", 0.2);

    const clusters = {
        ai: ["Artificial Intelligence", "Machine Learning", "Data Science", "Data Analysis", "Research", "Robotics"],
        dev: ["Web Development", "Mobile Development", "JavaScript", "Python", "Java", "React", "Node.js", "SQL", "MongoDB", "Git"],
        cloud: ["Cloud Computing", "DevOps", "AWS", "Docker", "Cybersecurity"],
        design: ["UI/UX Design", "Figma", "Photoshop"],
        business: ["Product Management", "Entrepreneurship", "Startups", "Business Strategy", "Finance", "Leadership", "Project Management"],
        marketing: ["Digital Marketing", "Content Writing", "Social Media", "SEO"],
        creative: ["Photography", "Writing", "Gaming", "AR/VR"],
        tech: ["Blockchain", "Sustainability", "Healthcare Tech", "EdTech", "IoT"]
    };

    const tagClusterMap = new Map();
    for (const clusterName in clusters) {
        for (const tag of clusters[clusterName]) {
            tagClusterMap.set(tag, clusterName);
        }
    }

    const matrix = new Map();
    for (const tagA of tags) {
        const tagBMap = new Map();
        for (const tagB of tags) {
            if (tagA === tagB) {
                tagBMap.set(tagB, 1.0);
                continue;
            }

            const sortedKey = [tagA, tagB].sort().join('|');
            if (specificScores.has(sortedKey)) {
                tagBMap.set(tagB, specificScores.get(sortedKey));
                continue;
            }

            const clusterA = tagClusterMap.get(tagA);
            const clusterB = tagClusterMap.get(tagB);
            
            if (clusterA && clusterA === clusterB) {
                tagBMap.set(tagB, 0.5);
                continue;
            }

            tagBMap.set(tagB, 0.1);
        }
        matrix.set(tagA, tagBMap);
    }
    
    return matrix;
}

function calculateUserEventSimilarity(userTags, eventTags) {
    let totalSimilarity = 0;
    
    userTags.forEach(userTag => {
        let maxSimilarity = 0;
        eventTags.forEach(eventTag => {
            const userTagMap = similarityMatrix.get(userTag);
            if (userTagMap) {
                const similarity = userTagMap.get(eventTag) || 0.1;
                maxSimilarity = Math.max(maxSimilarity, similarity);
            } else {
                maxSimilarity = Math.max(maxSimilarity, 0.1);
            }
        });
        totalSimilarity += maxSimilarity;
    });
    
    return userTags.length > 0 ? totalSimilarity / userTags.length : 0;
}

const similarityMatrix = generateSimilarityMatrix();

module.exports = { calculateUserEventSimilarity, similarityMatrix };