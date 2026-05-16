pipeline {
    agent any
    
    // 定义环境变量
    environment {
        PYTHON_HOME = 'C:\\Python39'  // 修改为你的Python安装路径
        PATH = "${PYTHON_HOME};${PYTHON_HOME}\\Scripts;${PATH}"
        PROJECT_DIR = "${WORKSPACE}"
        REPORT_DIR = "${WORKSPACE}\\reports"
        ALLURE_REPORT_DIR = "${REPORT_DIR}\\allure-report"
        ALLURE_RESULTS_DIR = "${REPORT_DIR}\\allure-results"
    }
    
    // 构建触发器
    triggers {
        pollSCM('H/5 * * * *')  // 每5分钟检查一次代码变更
    }
    
    // 构建选项
    options {
        timestamps()  // 显示构建时间戳
        timeout(time: 30, unit: 'MINUTES')  // 构建超时时间
        buildDiscarder(logRotator(numToKeepStr: '10'))  // 保留最近10次构建记录
    }
    
    stages {
        stage('检出代码') {
            steps {
                echo '正在从Git仓库检出代码...'
                git branch: 'main', url: 'https://github.com/your-repo/api-automation-platform.git'  // 修改为你的Git仓库地址
            }
        }
        
        stage('安装依赖') {
            steps {
                echo '正在安装Python依赖包...'
                bat 'cd ${PROJECT_DIR} && pip install -r requirements.txt'
            }
        }
        
        stage('执行测试') {
            steps {
                echo '正在执行接口自动化测试...'
                bat 'cd ${PROJECT_DIR} && python run_tests.py --env test --report'
            }
        }
        
        stage('生成报告') {
            steps {
                echo '正在生成Allure测试报告...'
                bat 'cd ${PROJECT_DIR} && allure generate ${ALLURE_RESULTS_DIR} -o ${ALLURE_REPORT_DIR} --clean'
            }
        }
    }
    
    post {
        always {
            echo '清理构建环境...'
            // 可以在这里添加清理操作
        }
        
        success {
            echo '测试执行成功！'
            // 发送成功通知
            emailext (
                subject: "接口自动化测试 - 成功: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: """
                    <h2>接口自动化测试执行成功</h2>
                    <p>项目: ${env.JOB_NAME}</p>
                    <p>构建编号: ${env.BUILD_NUMBER}</p>
                    <p>构建时间: ${env.BUILD_TIMESTAMP}</p>
                    <p>测试报告: <a href="${env.BUILD_URL}allure">点击查看</a></p>
                """,
                to: "test@example.com",  // 修改为你的邮箱地址
                mimeType: "text/html"
            )
        }
        
        failure {
            echo '测试执行失败！'
            // 发送失败通知
            emailext (
                subject: "接口自动化测试 - 失败: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: """
                    <h2>接口自动化测试执行失败</h2>
                    <p>项目: ${env.JOB_NAME}</p>
                    <p>构建编号: ${env.BUILD_NUMBER}</p>
                    <p>构建时间: ${env.BUILD_TIMESTAMP}</p>
                    <p>测试报告: <a href="${env.BUILD_URL}allure">点击查看</a></p>
                    <p>构建日志: <a href="${env.BUILD_URL}console">点击查看</a></p>
                """,
                to: "test@example.com",  // 修改为你的邮箱地址
                mimeType: "text/html"
            )
        }
    }
}
