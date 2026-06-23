class PaperGenerator:
    def _get_shared_style(self):
        """
        Returns print-safe styles utilizing strict physical millimeter measurements.
        Completely drops modern flex layouts for maximum headless compatibility.
        """
        return """
        @page { 
            size: A4; 
            margin: 0; 
        }
        body { 
            margin: 0; 
            padding: 0; 
            background-color: #ffffff; 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
        }
        .page { 
            width: 210mm; 
            height: 297mm; 
            page-break-after: always; 
            position: relative; 
            box-sizing: border-box;
            overflow: hidden;
            background: #ffffff;
        }
        .slot { 
            width: 210mm; 
            border-bottom: 1px dashed #cccccc; 
            box-sizing: border-box; 
            position: relative;
            overflow: hidden;
            text-align: center; /* Safe, traditional block-element centering layout */
        }
        .slot.small  { height: 99mm; }
        .slot.middle { height: 148.5mm; }
        .slot.large  { height: 297mm; border-bottom: none; }
        
        .q-num { 
            font-weight: bold; 
            font-size: 14pt;
            position: absolute; 
            top: 8mm;
            left: 10mm;
            background: #ffffff;
            padding: 2px 6px;
            z-index: 10;
            border-radius: 4px;
        }
        .slot img {
            display: inline-block;
            max-width: 90%;
            height: auto; /* Hard-enforces true proportional preservation across all printers */
            margin-top: 10mm;
        }
        """

    def generate_question_paper(self, blueprint_pages):
        # Using raw template mechanics to prevent Python f-string brace conflicts
        html_template = f"""
        <html>
        <head>
          <style>
            {self._get_shared_style()}
            .q-num {{ color: #000000; }}
          </style>
        </head>
        <body>
          {{% for page in blueprint_pages %}}
            <div class="page">
              {{% for slot in page.slots %}}
                <div class="slot {{{{ slot.spaceSize }}}}">
                  <div class="q-num">{{{{ slot.qNum }}}}</div>
                  <img src="{{{{ slot.qImage }}}}" alt="Question {{{{ slot.qNum }}}}">
                </div>
              {{% endfor %}}
            </div>
          {{% endfor %}}
        </body>
        </html>
        """
        # Clean up double escaped syntax to standard Jinja blocks for the rendering engine
        return html_template.replace("{{%", "{%").replace("%}}", "%}").replace("{{{{", "{{").replace("}}}}", "}}")

    def generate_answer_key(self, blueprint_pages):
        html_template = f"""
        <html>
        <head>
          <style>
            {self._get_shared_style()}
            .q-num {{ color: #dc2626; }}
          </style>
        </head>
        <body>
          {{% for page in blueprint_pages %}}
            <div class="page">
              {{% for slot in page.slots %}}
                <div class="slot {{{{ slot.spaceSize }}}}">
                  <div class="q-num">{{{{ slot.qNum }}}} (ANSWER)</div>
                  <img src="{{{{ slot.aImage }}}}" alt="Answer {{{{ slot.qNum }}}}">
                </div>
              {{% endfor %}}
            </div>
          {{% endfor %}}
        </body>
        </html>
        """
        return html_template.replace("{{%", "{%").replace("%}}", "%}").replace("{{{{", "{{").replace("}}}}", "}}")