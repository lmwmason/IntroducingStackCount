import React, { useState, useMemo, useCallback, useEffect } from 'react';

interface PathStep {
    a: number;
    b: number;
    depth: number;
    type: 'push' | 'pop' | 'base' | 'fail';
    timestamp: number;
}

interface MemoCache {
    [key: string]: number;
}

const calculateAndTrace = (
    currentN: number,
    a: number,
    b: number,
    path: PathStep[],
    depth: number,
    timestampRef: { current: number },
    cache: MemoCache
): number => {
    const key = `${a}-${b}`;
    if (cache[key] !== undefined) {
        return cache[key];
    }

    const currentTimestamp = timestampRef.current++;

    if (a < b || a > currentN || b > currentN) {
        return 0;
    }

    if (a + b === currentN * 2) {
        path.push({ a, b, depth, type: 'base', timestamp: currentTimestamp });
        cache[key] = 1;
        return 1;
    }

    let ans = 0;

    path.push({ a, b, depth, type: 'push', timestamp: currentTimestamp });
    ans += calculateAndTrace(currentN, a + 1, b, path, depth + 1, timestampRef, cache);

    path.push({ a, b, depth, type: 'pop', timestamp: currentTimestamp });
    ans += calculateAndTrace(currentN, a, b + 1, path, depth + 1, timestampRef, cache);

    cache[key] = ans;
    return ans;
};

const RecursiveTreeVisualizer: React.FC = () => {
    const [inputN, setInputN] = useState<number>(3);
    const [result, setResult] = useState<number | null>(null);
    const [visualizationPath, setVisualizationPath] = useState<PathStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [error, setError] = useState<string>('');
    const [nodeResults, setNodeResults] = useState<MemoCache>({});

    const goToNextStep = useCallback(() => {
        if (currentStepIndex < visualizationPath.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        }
    }, [currentStepIndex, visualizationPath.length]);

    const goToPrevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex]);

    const handleCalculate = useCallback(() => {
        if (inputN < 0) {
            setError(`N 값은 0 이상이어야 합니다.`);
            setResult(null);
            setVisualizationPath([]);
            setCurrentStepIndex(0);
            setNodeResults({});
            return;
        }

        setError('');
        const path: PathStep[] = [];
        const timestampRef = { current: 0 };
        const cache: MemoCache = {};
        const finalResult = calculateAndTrace(inputN, 0, 0, path, 0, timestampRef, cache);

        setResult(finalResult);
        setVisualizationPath(path);
        setCurrentStepIndex(0);
        setNodeResults(cache);

    }, [inputN]);

    useEffect(() => {
        handleCalculate();
    }, [handleCalculate]);

    const treeData = useMemo(() => {
        const uniqueNodes = visualizationPath.filter((step, index, self) =>
            self.findIndex(t => t.a === step.a && t.b === step.b && t.depth === step.depth) === index
        );

        const groupedByDepth = uniqueNodes.reduce((acc, node) => {
            if (!acc[node.depth]) acc[node.depth] = [];
            acc[node.depth].push(node);
            return acc;
        }, {} as Record<number, PathStep[]>);

        return groupedByDepth;
    }, [visualizationPath]);

    const TreeView = useMemo(() => {
        if (!Object.keys(treeData).length) return <p>N을 입력하고 계산을 시작하세요.</p>;

        const currentStep = visualizationPath[currentStepIndex];

        return (
            <>
                <div style={{ position: 'relative', overflowX: 'auto', padding: '20px 0', minHeight: '400px', backgroundColor: '#fafafa' }}>
                    <h3 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>재귀 호출 트리의 깊이별 시각화</h3>

                    {Object.keys(treeData).map(depthStr => {
                        const depth = parseInt(depthStr);
                        const nodesAtDepth = treeData[depth];

                        return (
                            <div key={depth} style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', minHeight: '50px' }}>
                                <span style={{ position: 'absolute', left: 0, fontWeight: 'bold', marginLeft: '10px' }}>Depth {depth}</span>

                                {nodesAtDepth.map((node, index) => {
                                    const nodeKey = `${node.a}-${node.b}`;
                                    const finalResultValue = nodeResults[nodeKey];

                                    const hasBeenCalled = visualizationPath.slice(0, currentStepIndex + 1).some(step =>
                                        step.a === node.a && step.b === node.b && step.depth === node.depth
                                    );

                                    const isCurrent = currentStep &&
                                        currentStep.a === node.a &&
                                        currentStep.b === node.b &&
                                        currentStep.depth === node.depth;

                                    let borderColor = '#ccc';
                                    let backgroundColor = '#eee';
                                    let statusText = `f(${node.a}, ${node.b})`;
                                    let resultDisplay = '';

                                    if (hasBeenCalled) {
                                        backgroundColor = '#e0f7fa';
                                        borderColor = 'darkblue';
                                    }

                                    if (isCurrent) {
                                        backgroundColor = '#ffeb3b';
                                        borderColor = 'red';
                                    }

                                    if (finalResultValue !== undefined && finalResultValue !== null) {
                                        resultDisplay = `결과: ${finalResultValue}`;
                                        if (node.type === 'base') {
                                            backgroundColor = 'lightgreen';
                                            borderColor = 'green';
                                            statusText = `SUCCESS`;
                                            resultDisplay = `결과: 1`;
                                        } else if (finalResultValue === 0) {
                                            if (node.a < node.b || node.a > inputN || node.b > inputN) {
                                                backgroundColor = '#ffcdd2';
                                                borderColor = 'red';
                                                statusText = `FAIL`;
                                            }
                                        }
                                    }

                                    const nodeStyle: React.CSSProperties = {
                                        padding: '8px 15px',
                                        margin: '0 10px',
                                        borderRadius: '20px',
                                        border: `2px solid ${borderColor}`,
                                        backgroundColor: backgroundColor,
                                        opacity: hasBeenCalled ? 1 : 0.6,
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        boxShadow: isCurrent ? '0 0 10px rgba(255, 0, 0, 0.7)' : 'none',
                                        transition: 'all 0.3s ease-in-out',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        fontSize: '14px'
                                    };

                                    return (
                                        <div key={`${depth}-${node.a}-${node.b}`} style={nodeStyle} title={`Depth: ${depth}`}>
                                            <div>{statusText}</div>
                                            <div style={{ fontWeight: 'normal', fontSize: '11px', color: 'gray', marginTop: '3px' }}>{resultDisplay}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '30px', borderTop: '1px solid #ccc', paddingTop: '10px', textAlign: 'center' }}>
                    <p>
                        <strong>현재 호출 단계 ({currentStepIndex + 1}/{visualizationPath.length})</strong>
                        {currentStep &&
                            ` : f(${currentStep.a}, ${currentStep.b}) 호출. 
                            동작: ${currentStep.type === 'push' ? 'PUSH (a+1) 시도' : currentStep.type === 'pop' ? 'POP (b+1) 시도' : currentStep.type === 'base' ? '종료 (성공)' : '종료 (실패)'}`
                        }
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button onClick={() => setCurrentStepIndex(0)} disabled={currentStepIndex === 0}>처음으로</button>
                        <button onClick={goToPrevStep} disabled={currentStepIndex === 0}>이전 단계</button>
                        <button onClick={goToNextStep} disabled={currentStepIndex === visualizationPath.length - 1}>다음 단계</button>
                    </div>
                </div>
            </>
        );
    }, [treeData, visualizationPath, currentStepIndex, goToNextStep, goToPrevStep, nodeResults, inputN]);

    const pythonCode = `n=int(input())

def Stack(pushCnt,popCnt):
    global n
    
    if pushCnt<popCnt or pushCnt>n or popCnt>n:
        return 0
    if pushCnt+popCnt==n*2:
        return 1
        
    ans=0
    
    ans+=Stack(pushCnt+1,popCnt)
    ans+=Stack(pushCnt,popCnt+1)
    
    return ans
    
print(Stack(0,0))`;

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <header style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                <h1>정보 스택 경우의 수 발표 자료</h1>
            </header>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ flex: 1.5 }}>
                    <section style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                        <h2>사용자 입력 & 계산 결과</h2>
                        <div>
                            <label htmlFor="n-input" style={{ marginRight: '10px', fontWeight: 'bold' }}>N 값 입력:</label>
                            <input
                                id="n-input"
                                type="number"
                                value={inputN}
                                onChange={(e) => setInputN(Number(e.target.value))}
                                style={{ padding: '5px', width: '60px' }}
                                min="0"
                            />
                            <button onClick={handleCalculate} style={{ padding: '5px 15px', marginLeft: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
                                계산 시작 및 시각화
                            </button>
                        </div>
                        {error && <p style={{ color: 'red', marginTop: '10px' }}>⚠️ {error}</p>}
                        {result !== null && (
                            <h3 style={{ marginTop: '15px' }}>
                                N = {inputN} 일 때, 총 경우의 수: <span style={{ color: 'navy' }}>{result}</span>
                            </h3>
                        )}
                    </section>

                    <section style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
                        {TreeView}
                    </section>
                </div>

                <div style={{ flex: 1 }}>
                    <section style={{ marginBottom: '20px' }}>
                        <h2>원본 Python 코드</h2>
                        <pre style={{ backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '5px', overflowX: 'auto' }}>
                            <code>{pythonCode}</code>
                        </pre>
                    </section>

                    <section>
                        <h2>코드 설명</h2>
                        <dl>
                            <dt><strong>문제 정의</strong></dt>
                            <dd style={{ marginBottom: '10px' }}>총 N개의 Push와 N개의 Pop 연산을 유효하게 나열하는 경우의 수를 계산</dd>

                            <dt><strong>함수 Stack(pushCnt, popCnt)</strong></dt>
                            <dd style={{ marginBottom: '10px' }}>현재까지 <strong>Push</strong> pushCnt번, <strong>Pop</strong> popCnt번 했을 때, 목표까지 도달 가능한 경우의 수를 재귀적으로 계산</dd>

                            <dt><strong>종료 조건</strong></dt>
                            <dd style={{ marginBottom: '10px' }}>
                                <ul>
                                    <li><strong>성공:</strong> pushCnt+popCnt = 2N (총 2N 연산 완료) &rarr; <code>1</code> 반환.</li>
                                    <li><strong>실패:</strong> pushCnt &lt; popCnt (Pop이 Push보다 많음) 또는 pushCnt &gt; N 또는 popCnt &gt; N &rarr; <code>0</code> 반환.</li>
                                </ul>
                            </dd>
                        </dl>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default RecursiveTreeVisualizer;