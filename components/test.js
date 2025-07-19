        <VRadioGroup v-model="selectedTemplate" class="mt-8">
          <div class="d-flex flex-column flex-md-row gap-y-4 gap-sm-x-4">
            <VRadio value="1" class="radio-card">
            <template #label>
              <div>
                <div
                  class="label-box"
                  :class="{ 'label-box--selected': selectedTemplate === '1' }"
                >
                <span style="font-size: 9px;">13</span>
                    <div class="label-content" style="margin-top: 5px">
                    <div class="label left" style="width: 50%">
                      <img
                        style="height: 21mm; width: 21mm;"
                        alt="Штрихкод"
                        :src="datamatrix"
                      />
                    </div>
                    <div class="label right">
                        <div style="text-align: center;">
                          <img
                            style="height: 5mm;"
                            alt="Штрихкод"
                            :src="CzLogo" />
                        </div>

                        <div class="spacer">
                        <div style="text-align: left;">
                          <p style="margin-block-end: 0">{{props.name}}</p>
                          <p style="margin-block-end: 0">Цвет: {{ props.color }}</p>
                          <p style="margin-block-end: 0">Размер: {{props.size}}</p>
                        </div>
                        </div>
                    </div>
                    </div>
                    <div style="text-align: right; margin-bottom: 5px">
                      <span style="font-size: 14px; font-weight: bold">10</span>
                    </div>

                    <div>
                    <span style="margin-right: 10px; font-size: 11px">01234567891011</span>
                    <span style="font-size: 11px">2NnIRDZfTGMDA</span>
                    </div>
                </div>
              </div>
            </template>
          </VRadio>

          <VRadio value="2" class="radio-card" >
            <template #label>
                <div
                  class="label-box"
                  :class="{ 'label-box--selected': selectedTemplate === '2' }"
                >
                    <div class="label-header">
                    <span class="label-header-text">{{ props.name }}</span>
                    </div>
                    <div class="label-content">
                    <div class="label" style="width: 80%">
                        <div class="label-line">Артикул: {{ props.article }}</div>
                        <div class="label-line">Цвет: {{ props.color }}</div>
                    </div>

                    <div class="label" style="width: 20%">
                        <div class="label-size">{{ props.size }}</div>
                    </div>
                    </div>
                    <div class="label-content">
                    <div class="label">
                        <div class="label-line">{{ props.client?.name }}</div>
                        <div class="label-line">Состав: {{ props.composition || '' }}</div>
                    </div>                  
                    </div>
                    
                    <div class="label-barcode-block">
                    <img
                      style="height: 14mm;"
                      alt="Штрихкод"
                      :src="barcodeEAN13"
                    />
                    </div>
                </div>
            </template>
          </VRadio>

          <!-- <VRadio value="3" class="radio-card">
            <template #label>
                <div
                  class="label-box"
                  :class="{ 'label-box--selected': selectedTemplate === '3' }"
                >
                    <div class="label-header">
                    <span class="label-header-text">{{ props.name }}</span>
                    </div>
                    <div class="label-content">
                    <div class="label left" style="width: 50%">
                        <img
                        style="height: 21mm; width: 21mm;"
                        alt="Штрихкод"
                        src="https://barcode.tec-it.com/barcode.ashx?data=01046605684903452152NnIRDZfTGMD%1D91EE11%1D92oeGgLmUSMbPtHc2xVZxqkcrYSXz6%2B2ADQ0H4ZUANOqw%3D&code=GS1DataMatrix&translate-esc=on&dmsize=Default" />
                    </div>
                    <div class="label right">
                        <div style="text-align: center;">
                        ЧЕСТНЫЙ ЗНАК
                        </div>

                        <div class="spacer">
                        <div style="text-align: center;">
                            {{props.name}}, цвет {{ props.color }}, размер {{props.size}}
                        </div>
                        </div>
                    </div>
                    </div>
                    <div style="text-align: right;">
                    <span style="font-size: 14px; font-weight: bold">1</span>
                    </div>
                    <div>
                    <span style="margin-right: 10px; font-size: 10px">01234567891011</span>
                    <span style="font-size: 10px">2NnIRDZfTGMDA</span>
                    </div>
                </div>
            </template>
          </VRadio> -->
          </div>          
        </VRadioGroup>
