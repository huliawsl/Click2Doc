<template>
    <div class="home">
        <h1 class="title">Welcome to StepCraft</h1>
        <div class="msg">{{ msg }}</div>
        <div class="btn">
        <button class="new" @click="createNewRecord">Create a step record</button>
            <button class="open" @click="openStepRecord">Open a step record</button>
        </div>

        <!-- 隐藏的文件输入 -->
        <input
          ref="fileInput"
          type="file"
          accept=".step"
          @change="handleFileSelect"
          style="display: none"
        />
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const msg = ref('Create tutorials and guides effortlessly. Start a new project or open an existing one to begin.')
const router = useRouter()
const fileInput = ref<HTMLInputElement>()

const createNewRecord = () => {
  router.push('/edit')
}

// 打开步骤记录文件
const openStepRecord = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    const content = await readFileAsText(file)

    // 检查文件是否为空
    if (!content.trim()) {
      throw new Error('文件内容为空')
    }

    let stepData
    try {
      stepData = JSON.parse(content)
    } catch (parseError) {
      throw new Error('文件不是有效的JSON格式')
    }

    // 详细验证文件格式
    const validationErrors = validateStepFileFormat(stepData)
    if (validationErrors.length > 0) {
      throw new Error('文件格式验证失败：\n' + validationErrors.join('\n'))
    }

    // 将数据存储到localStorage并跳转到编辑页面
    localStorage.setItem('importedStepData', JSON.stringify(stepData))
    router.push('/edit?import=true')

  } catch (error) {
    console.error('Error importing step file:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    alert('导入文件失败：' + errorMessage)
  }

  // 重置文件输入
  if (target) {
    target.value = ''
  }
}

// 验证Step文件格式
const validateStepFileFormat = (stepData: any): string[] => {
  const errors: string[] = []

  // 检查基本结构
  if (typeof stepData !== 'object' || stepData === null) {
    errors.push('文件内容不是有效的对象')
    return errors
  }

  // 检查版本号
  if (!stepData.version) {
    errors.push('缺少版本号字段 (version)')
  } else if (typeof stepData.version !== 'string') {
    errors.push('版本号必须是字符串')
  }

  // 检查步骤数组
  if (!stepData.steps) {
    errors.push('缺少步骤数组字段 (steps)')
  } else if (!Array.isArray(stepData.steps)) {
    errors.push('steps字段必须是数组')
  } else {
    // 验证每个步骤的格式
    stepData.steps.forEach((step: any, index: number) => {
      if (typeof step !== 'object' || step === null) {
        errors.push(`步骤 ${index + 1}: 不是有效的对象`)
        return
      }

      // 检查必需字段
      if (!step.id) {
        errors.push(`步骤 ${index + 1}: 缺少id字段`)
      }
      if (!step.timestamp || typeof step.timestamp !== 'number') {
        errors.push(`步骤 ${index + 1}: 缺少或无效的timestamp字段`)
      }
      if (!step.action || typeof step.action !== 'string') {
        errors.push(`步骤 ${index + 1}: 缺少或无效的action字段`)
      }
      if (!step.description || typeof step.description !== 'string') {
        errors.push(`步骤 ${index + 1}: 缺少或无效的description字段`)
      }

      // 检查可选字段的类型
      if (step.position && (typeof step.position !== 'object' ||
          typeof step.position.x !== 'number' ||
          typeof step.position.y !== 'number')) {
        errors.push(`步骤 ${index + 1}: position字段格式无效`)
      }
      if (step.element && typeof step.element !== 'string') {
        errors.push(`步骤 ${index + 1}: element字段必须是字符串`)
      }
      if (step.screenshot && typeof step.screenshot !== 'string') {
        errors.push(`步骤 ${index + 1}: screenshot字段必须是字符串`)
      }
    })
  }

  // 检查其他可选字段
  if (stepData.title && typeof stepData.title !== 'string') {
    errors.push('title字段必须是字符串')
  }
  if (stepData.description && typeof stepData.description !== 'string') {
    errors.push('description字段必须是字符串')
  }
  if (stepData.exportTime && typeof stepData.exportTime !== 'number') {
    errors.push('exportTime字段必须是数字')
  }

  return errors
}

// 读取文件内容
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('File reading error'))
    reader.readAsText(file)
  })
}
</script>
<style lang="less">
.home {
    flex: 1;
    text-align: center;

    .title {
        margin: 0 auto;
        margin-top: 72px;
        height: auto;
        font-size: 32px;
        font-weight: 700;
        line-height: 40px;
    }

    .msg {
        margin: 0 auto;
        margin-top: 21px;
         padding: 0 20px;
    }

    .btn {
        display: flex;
        justify-content: center;
        gap: 41px;
        margin-top: 40px;
        flex-wrap: wrap;
         padding: 0 20px;
        button {
            width: 302px;
            height: 50px;
            border-radius: 20px;
        }

        .new {
            background: rgba(220, 232, 243, 1);
            font-weight: 700;
        }

        .open {
            background: rgba(241, 242, 244, 1);
            font-weight: 700;
        }
    }
}
</style>