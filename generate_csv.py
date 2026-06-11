import csv

roles_and_questions = [
    # Frontend
    {
        "Department": "Engineering", "Role": "Frontend Developer", "Difficulty": "Medium",
        "Question": "Explain the difference between controlled and uncontrolled components in React.",
        "Keywords": "controlled, uncontrolled, state, props, refs, useRef, useState, DOM, forms, virtual DOM, event handler, value, defaultValue, two-way binding, React, re-render, component lifecycle, unidirectional data flow"
    },
    {
        "Department": "Engineering", "Role": "Frontend Developer", "Difficulty": "Hard",
        "Question": "Walk me through how you would optimize a React application that has severe performance and re-rendering issues.",
        "Keywords": "React.memo, useMemo, useCallback, code splitting, lazy loading, Suspense, debounce, throttle, bundle size, Lighthouse, profiling, virtualized lists, React window, state colocation, Redux selector optimization, unnecessary re-renders"
    },
    # Backend
    {
        "Department": "Engineering", "Role": "Backend Developer", "Difficulty": "Hard",
        "Question": "How would you design a rate-limiter for a public REST API?",
        "Keywords": "rate limiter, token bucket, leaky bucket, sliding window, fixed window, Redis, caching, IP address, user ID, API gateway, HTTP 429, Too Many Requests, throughput, concurrency, load balancing, Nginx"
    },
    {
        "Department": "Engineering", "Role": "Backend Developer", "Difficulty": "Medium",
        "Question": "What is the N+1 query problem and how do you solve it?",
        "Keywords": "N+1, ORM, database querying, Django, SQLAlchemy, join, select_related, prefetch_related, Eager Loading, Lazy Loading, SQL, database performance, batching, DataLoader, GraphQL"
    },
    # Full Stack
    {
        "Department": "Engineering", "Role": "Full Stack Developer", "Difficulty": "Hard",
        "Question": "Explain the architecture you would use to build a scalable, real-time chat application.",
        "Keywords": "WebSockets, Socket.io, Redis Pub/Sub, microservices, load balancer, sticky sessions, horizontal scaling, Cassandra, NoSQL, message broker, Kafka, RabbitMQ, React, Node.js, connection pool"
    },
    # DevOps
    {
        "Department": "Engineering", "Role": "DevOps Engineer", "Difficulty": "Hard",
        "Question": "Explain how Kubernetes handles pod scheduling and what factors influence it.",
        "Keywords": "Kubernetes, K8s, kube-scheduler, node selector, affinity, anti-affinity, taints, tolerations, resource limits, resource requests, CPU, memory, priority classes, eviction, nodes, control plane"
    },
    {
        "Department": "Engineering", "Role": "DevOps Engineer", "Difficulty": "Medium",
        "Question": "What is the difference between blue-green and canary deployments?",
        "Keywords": "blue-green, canary, deployment strategy, traffic routing, rollback, zero-downtime, staging, production, load balancer, A/B testing, risk mitigation, continuous delivery, pipeline, ArgoCD"
    },
    # Data Engineer
    {
        "Department": "Engineering", "Role": "Data Engineer", "Difficulty": "Hard",
        "Question": "Explain the concept of exactly-once semantics in Apache Kafka.",
        "Keywords": "Kafka, exactly-once, transactional API, idempotence, producer, consumer, offsets, log append, messaging semantics, stream processing, Kafka Streams, at-least-once, at-most-once, deduplication, acknowledging"
    },
    # Data Scientist
    {
        "Department": "Engineering", "Role": "Data Scientist", "Difficulty": "Medium",
        "Question": "How do you evaluate whether a machine learning model is overfitting, and how do you fix it?",
        "Keywords": "overfitting, bias-variance tradeoff, cross-validation, validation set, training loss, validation loss, regularization, L1, L2, Lasso, Ridge, dropout, early stopping, pruning, generalization, unseen data, hyperparameter tuning"
    },
    # AI/ML
    {
        "Department": "Engineering", "Role": "AI/ML Engineer", "Difficulty": "Hard",
        "Question": "What is a RAG pipeline and how would you architect one for low-latency retrieval?",
        "Keywords": "RAG, Retrieval-Augmented Generation, vector database, Pinecone, Milvus, embeddings, LLM, prompt engineering, semantic search, chunking strategy, cosine similarity, index, approximate nearest neighbor, ANN, FAISS, caching, context window"
    },
    {
        "Department": "Engineering", "Role": "AI/ML Engineer", "Difficulty": "Medium",
        "Question": "Explain how attention mechanisms work in transformer architectures.",
        "Keywords": "Transformer, self-attention, query, key, value, matrices, dot product, softmax, multi-head attention, context, sequence, weights, positional encoding, BERT, GPT, NLP, sequence-to-sequence"
    },
    # Mobile
    {
        "Department": "Engineering", "Role": "Mobile Developer", "Difficulty": "Medium",
        "Question": "How do you manage state and side effects in a complex React Native or Flutter application?",
        "Keywords": "Redux, Context API, MobX, BLoC, Provider, Riverpod, state management, side effects, async, Redux Thunk, Redux Saga, UI thread, performance, re-rendering, local storage, AsyncStorage"
    },
    # QA Engineer
    {
        "Department": "Engineering", "Role": "QA Engineer", "Difficulty": "Medium",
        "Question": "Describe your approach to building an automated testing framework from scratch.",
        "Keywords": "Selenium, Playwright, Cypress, Page Object Model, POM, TDD, BDD, Cucumber, CI/CD integration, assertion library, test data management, reporting, cross-browser, parallel execution, maintainability, flaky tests"
    },
    # Behavioral / Universal
    {
        "Department": "Human Resources", "Role": "Any", "Difficulty": "Medium",
        "Question": "Tell me about a technically challenging project you led and the decisions you made.",
        "Keywords": "leadership, project management, technical trade-offs, architecture, challenges, roadblocks, communication, team coordination, planning, execution, impact, results, scaling, decision-making, ownership, responsibility"
    },
    {
        "Department": "Human Resources", "Role": "Any", "Difficulty": "Medium",
        "Question": "How do you approach debugging a production issue under pressure?",
        "Keywords": "debugging, production, incident response, logs, monitoring, Datadog, Prometheus, rollback, hotfix, root cause analysis, RCA, communication, calm, prioritization, reproduction, testing, isolation"
    },
    {
        "Department": "Human Resources", "Role": "Any", "Difficulty": "Hard",
        "Question": "Describe a time you had to resolve a serious conflict between team members regarding a technical architecture decision.",
        "Keywords": "conflict resolution, empathy, active listening, technical trade-offs, pros and cons, consensus, compromise, documentation, proof of concept, PoC, respect, team dynamics, leadership, mediation, escalation"
    }
]

with open("master_question_bank.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["Department", "Role", "Question", "Keywords", "Difficulty"])
    writer.writeheader()
    writer.writerows(roles_and_questions)

print("Generated master_question_bank.csv successfully.")
