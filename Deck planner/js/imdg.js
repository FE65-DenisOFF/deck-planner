// ============================================================================
// ПОЛНАЯ СИСТЕМА СЕГРЕГАЦИИ IMDG
// ============================================================================
const SEGREGATION_DISTANCES = {
    'X': 0, 'A': 1.83, 'B': 3.66, 'C': 5.49, '*': 5.49
};

const SEGREGATION_MATRIX = {
    '1.1': {'1.2':'1.2','1.3':'1.3','1.4':'*','1.5':'*','1.6':'*','2.1':'C','2.2':'B','2.3':'B','3':'C','4.1':'C','4.2':'C','4.3':'C','5.1':'C','5.2':'C','6.1':'B','6.2':'C','7':'B','8':'C','9':'X'},
    '1.2': {'1.3':'1.3','1.4':'*','1.5':'*','1.6':'*','2.1':'C','2.2':'B','2.3':'B','3':'C','4.1':'C','4.2':'C','4.3':'C','5.1':'C','5.2':'C','6.1':'B','6.2':'C','7':'B','8':'C','9':'X'},
    '1.3': {'1.4':'*','1.5':'*','1.6':'*','2.1':'C','2.2':'B','2.3':'B','3':'C','4.1':'C','4.2':'C','4.3':'C','5.1':'C','5.2':'C','6.1':'B','6.2':'C','7':'B','8':'C','9':'X'},
    '1.4': {'1.5':'*','1.6':'*','2.1':'B','2.2':'A','2.3':'A','3':'B','4.1':'B','4.2':'B','4.3':'B','5.1':'B','5.2':'B','6.1':'X','6.2':'C','7':'B','8':'B','9':'X'},
    '1.5': {'1.6':'*','2.1':'B','2.2':'A','2.3':'A','3':'B','4.1':'B','4.2':'B','4.3':'B','5.1':'B','5.2':'B','6.1':'X','6.2':'C','7':'B','8':'B','9':'X'},
    '1.6': {'2.1':'B','2.2':'A','2.3':'A','3':'B','4.1':'B','4.2':'B','4.3':'B','5.1':'B','5.2':'B','6.1':'X','6.2':'C','7':'B','8':'B','9':'X'},
    '2.1': {'2.2':'X','2.3':'X','3':'B','4.1':'A','4.2':'B','4.3':'X','5.1':'B','5.2':'B','6.1':'X','6.2':'C','7':'B','8':'A','9':'X'},
    '2.2': {'2.3':'X','3':'A','4.1':'X','4.2':'A','4.3':'X','5.1':'X','5.2':'A','6.1':'X','6.2':'B','7':'A','8':'X','9':'X'},
    '2.3': {'3':'B','4.1':'X','4.2':'B','4.3':'X','5.1':'X','5.2':'B','6.1':'X','6.2':'B','7':'A','8':'X','9':'X'},
    '3':   {'4.1':'X','4.2':'B','4.3':'A','5.1':'B','5.2':'B','6.1':'X','6.2':'C','7':'B','8':'X','9':'X'},
    '4.1': {'4.2':'X','4.3':'A','5.1':'X','5.2':'A','6.1':'X','6.2':'C','7':'B','8':'A','9':'X'},
    '4.2': {'4.3':'A','5.1':'B','5.2':'B','6.1':'A','6.2':'C','7':'B','8':'A','9':'X'},
    '4.3': {'5.1':'X','5.2':'A','6.1':'X','6.2':'B','7':'B','8':'A','9':'X'},
    '5.1': {'5.2':'X','6.1':'X','6.2':'C','7':'A','8':'B','9':'X'},
    '5.2': {'6.1':'A','6.2':'C','7':'B','8':'B','9':'X'},
    '6.1': {'6.2':'X','7':'A','8':'X','9':'X'},
    '6.2': {'7':'C','8':'C','9':'X'},
    '7':   {'8':'X','9':'B'},
    '8':   {'9':'X'},
    '9':   {}
};

function getSegregationCode(class1, class2) {
    if (!class1 || !class2) return 'X';
    if (class1 === class2) return 'X';
    if (SEGREGATION_MATRIX[class1] && SEGREGATION_MATRIX[class1][class2] !== undefined) {
        return SEGREGATION_MATRIX[class1][class2];
    }
    if (SEGREGATION_MATRIX[class2] && SEGREGATION_MATRIX[class2][class1] !== undefined) {
        return SEGREGATION_MATRIX[class2][class1];
    }
    return 'X';
}

function getSegregationDistance(class1, class2) {
    const code = getSegregationCode(class1, class2);
    return SEGREGATION_DISTANCES[code] || 0;
}

function checkAllSegregationViolations() {
    violations = [];
    for (let i = 0; i < placedContainers.length; i++) {
        for (let j = i + 1; j < placedContainers.length; j++) {
            const c1 = placedContainers[i];
            const c2 = placedContainers[j];
            if (!c1.isHazardous || !c2.isHazardous) continue;
            if (!c1.imdgClass || !c2.imdgClass) continue;
            
            const requiredDist = getSegregationDistance(c1.imdgClass, c2.imdgClass);
            if (requiredDist === 0) continue;
            
            const dx = (c1.x + c1.length / 2) - (c2.x + c2.length / 2);
            const dy = (c1.y + c1.width / 2) - (c2.y + c2.width / 2);
            const actualDist = Math.sqrt(dx * dx + dy * dy);
            
            if (actualDist < requiredDist) {
                violations.push({
                    container1: c1,
                    container2: c2,
                    requiredDistance: requiredDist,
                    actualDistance: actualDist,
                    code: getSegregationCode(c1.imdgClass, c2.imdgClass)
                });
            }
        }
    }
    document.getElementById('stat-violations').textContent = violations.length;
}