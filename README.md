# BemRápido

Webapp de carrinhos mobile first, com asfalto livre e circuito indicado por uma linha interna. Todos os carros circulam no mesmo sentido, por fora da marcação, e podem ser pegos, arrastados e lançados pela criança. Após desacelerar e parar, retomam o piloto automático.

- Menu de adultos por pressão de 1,4 segundo no canto superior direito vazio. Se houver carro, o toque sempre pega o brinquedo.
- Nenhuma instrução visível durante a brincadeira.
- Tamanho: 40% a 100% do tamanho de referência. Quantidade: 1 a 8 carros. Ambas as preferências são salvas neste aparelho.
- Buzina e música centralizadas juntas. Botão musical alterna eletrônica → rock → desligada. Volume e efeitos separados nas configurações.
- Colisões com caixas orientadas, impulso, saída de apertos, som e faíscas mesmo ao empurrar com o dedo. Frente do carro acompanha sua velocidade.
- Limites físicos usam a rotação e dimensões reais; a posição desejada pelo dedo vai até o limite da tela para não gerar margens invisíveis.
- PWA: manifesto standalone, ícones 192/512 e service worker. Pode ser instalado por navegadores compatíveis e funciona offline após o primeiro carregamento completo. Em iOS, adicionar à Tela de Início pelo menu Compartilhar. O botão de instalação aparece nas configurações quando o navegador oferece essa opção.

Canvas e Web Audio, sem dependências externas, anúncios, placar, derrota ou coleta de dados. Áudio começa após interação.

Teste de regressão de lógica e PWA: `node verify.cjs`.

https://mqzgames.github.io/bemrapido/

## Modelos, velocidade e dois dedos
Configurações de velocidade de 25% a 175% afetam apenas o piloto automático. Dois dedos podem controlar e lançar dois veículos de forma independente. Os tipos disponíveis são carros normais (único padrão), caminhonetes, ônibus e caminhões, selecionados por caixas nas configurações. Cada modelo tem desenho, dimensões, peso, motor e buzina próprios. A buzina corresponde ao último veículo pego. Tipos e velocidade ficam salvos neste aparelho.
